// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MyToken is ERC20,Pausable,AccessControl{

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(uint256 initialSupply) ERC20("MyToken", "MTK"){
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        _mint(msg.sender, initialSupply);
    }
    
    /*//////////////////////////////////////////////////////////////
                    EXTERNAL / PUBLIC FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE){
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE){
        _unpause();
    }

    function mint(address to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _burn(from,amount);
    }

    function airdrop(address[] calldata to,uint256 amount)external onlyRole(DEFAULT_ADMIN_ROLE) {
        for(uint256 i=0;i<to.length;i++){
            _mint(to[i], amount);
        }
    }

    /*//////////////////////////////////////////////////////////////
                        OVERRIDES
    //////////////////////////////////////////////////////////////*/

    function _update(address from, address to, uint256 value) internal override whenNotPaused{
        super._update(from,to,value);
    }

    function approve(address spender, uint256 value) public override whenNotPaused returns(bool){
        return super.approve(spender,value);
    }
    
}