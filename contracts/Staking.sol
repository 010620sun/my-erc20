// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// interface for mint function
interface IMintable is IERC20{
    function mint(address to, uint256 amount)external;
}

contract Staking is ReentrancyGuard{
    
    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event Stake(address account, uint256 amount);
    event Unstake(address account, uint256 amount);
    event FinalizeReward(address account, uint256 amount);

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error NotEnoughStaked(address account, uint256 requested, uint256 staked);
    error NotEnoughReward(address account);

    /*//////////////////////////////////////////////////////////////
                              STORAGE
    //////////////////////////////////////////////////////////////*/

    uint256 constant REWARD_RATE_PER_YEAR = 5e16; // 5%
    uint256 constant SECONDS_PER_YEAR = 365 days;
    uint256 constant public REWARD_RATE_PER_SECOND = REWARD_RATE_PER_YEAR / SECONDS_PER_YEAR;

    mapping(address=>uint256)private staked;
    mapping(address=>uint256)private lastUpdated;
    mapping(address=>uint256)private rewards;   

    IMintable public token;

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address tokenAddress){
        token=IMintable(tokenAddress);
    }

    /*//////////////////////////////////////////////////////////////
                    EXTERNAL / PUBLIC FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function finalizeReward() external nonReentrant{

        updateReward();

        address owner = msg.sender;
        if(rewards[owner]<=0){
            revert NotEnoughReward(owner);
        }
        uint256 reward = rewards[owner];
        token.mint(owner, reward);
        rewards[owner]=0;

        emit FinalizeReward(owner,reward);
    }

    function stake(uint256 amount)external nonReentrant{

        updateReward();

        token.transferFrom(msg.sender,address(this), amount);
        staked[msg.sender] +=amount; 

        emit Stake(msg.sender,amount);
    }

    function unstake(uint256 amount) external nonReentrant{
        
        updateReward();

        address owner = msg.sender;

        if(amount>staked[owner]){
            revert NotEnoughStaked(owner,amount,staked[owner]);
        }

        staked[owner]-=amount;
        token.transfer(owner, amount);

        emit Unstake(owner,amount);
    }
    
    /*//////////////////////////////////////////////////////////////
                    EXTERNAL / PUBLIC VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function getStaked(address account)external view returns(uint256){
        return staked[account];
    }

    function getReward(address account)external view returns(uint256){
        return rewards[account];
    }

    function earned(address account) external view returns(uint256){

        uint256 lastReward = rewards[account];
        uint256 time = block.timestamp - lastUpdated[account];
        uint256 nowReward = lastReward + (staked[account]*REWARD_RATE_PER_SECOND*time)/1e18; 

        return nowReward;
    }

    /*//////////////////////////////////////////////////////////////
                        INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function updateReward() internal{

        address owner = msg.sender;
        
        if(lastUpdated[owner]==0){
            lastUpdated[owner]=block.timestamp;
            return;
        }
        uint256 time = block.timestamp - lastUpdated[owner];

        if(staked[owner]>0 && time>0){
            rewards[owner]+=(staked[owner]*REWARD_RATE_PER_SECOND*time)/1e18;
        }

        lastUpdated[owner]=block.timestamp;

    }

}