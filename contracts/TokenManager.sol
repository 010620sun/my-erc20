// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./MyToken.sol";

contract TokenManager is AccessControl{

    /*//////////////////////////////////////////////////////////////
                              STORAGE
    //////////////////////////////////////////////////////////////*/

    MyToken public immutable token;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address tokenAddress,address multisig){
        token = MyToken(tokenAddress);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    
    /*//////////////////////////////////////////////////////////////
                    EXTERNAL / PUBLIC FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function pause() external onlyRole(PAUSER_ROLE){
        token.pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE){
        token.unpause();
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE){
        token.mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyRole(BURNER_ROLE){
        token.burn(from, amount);
    }

    function airdrop(address[] calldata to, uint256 amount)external onlyRole(DEFAULT_ADMIN_ROLE){
        token.airdrop(to, amount);
    }
    
}