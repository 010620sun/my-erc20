// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MyToken is ERC20,Pausable,AccessControl{

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    constructor(uint256 initialSupply) ERC20("MyToken", "MTK"){
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(BURNER_ROLE, msg.sender);

        _mint(msg.sender, initialSupply);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE){
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE){
        _unpause();
    }

    function transfer(address to, uint256 value) public override whenNotPaused returns(bool){
        return super.transfer(to,value);
    }

    function approve(address spender, uint256 value) public override whenNotPaused returns(bool){
        return super.approve(spender,value);
    }

    function transferFrom(address from, address to, uint256 value) public override whenNotPaused returns(bool){
        return super.transferFrom(from,to,value);
    }

    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) whenNotPaused{
        _mint(to, amount);
    }

    function burn(address to, uint256 amount) public onlyRole(BURNER_ROLE) whenNotPaused{
        _burn(to,amount);
    }

    function airdrop(address[]calldata to,uint256 amount)public onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused{
        for(uint i=0;i<to.length;i++){
            transfer(to[i], amount);
        }
    }
}