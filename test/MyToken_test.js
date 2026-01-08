const { ethers } = require("hardhat");
const { expect } = require("chai");

describe("MyToken",function(){

    let token, owner, user1, user2;
    const initialSupply = ethers.parseUnits("1.0", 18);
    const defaultAmount = initialSupply;
    const smallAmount = ethers.parseUnits("0.1", 18);
    const bigAmount = ethers.parseUnits("10", 18);

    // deploy & initialize variables
    beforeEach(async ()=>{
        
        [owner,user1,user2]=await ethers.getSigners();

        const Token = await ethers.getContractFactory("MyToken");
        token = await Token.deploy(initialSupply);

    });

    // transfer() test
    describe("transfer()",()=>{

        let initialOwnerBalance, initialReceiverBalance;

        beforeEach(async()=>{

            initialOwnerBalance = await token.balanceOf(owner.address);
            initialReceiverBalance = await token.balanceOf(user1.address);

        });

        // normal transfer test
        it("normal transfer",async ()=>{

            await token.transfer(user1.address,smallAmount);
            expect(
                await token.balanceOf(owner.address)
            ).to.equal(initialOwnerBalance-smallAmount);
            expect(
                await token.balanceOf(user1.address)
            ).to.equal(initialReceiverBalance+smallAmount);
          
        });

        // Transfer event test
        it("emits Transfer event",async()=>{

            await expect(
                token.transfer(user1.address,smallAmount)
            ).to.emit(token,"Transfer")
            .withArgs(owner.address,user1.address,smallAmount);

        });

        // abnormal transfer(insufficient balance) test
        it("should revert if balance is insufficient", async ()=>{

            await expect(
                token.transfer(user1.address,bigAmount)
            ).to.be.revertedWithCustomError(token,"ERC20InsufficientBalance");
        });

    });

    // approve() test
    describe("approve()",()=>{

        let allowanceAmount = smallAmount;

         // approve 
        it("approve()",async ()=>{

            await token.approve(user1.address,allowanceAmount);
            expect(
                await token.allowance(owner.address,user1.address)    
            ).to.equal(allowanceAmount);

        });

        // Approval event emit test
        it("emits Approval event",async()=>{

            await expect(
                token.approve(user1.address,allowanceAmount)
            ).to.emit(token,"Approval")
            .withArgs(owner.address,user1.address,allowanceAmount);

        });

    });

    // transferFrom() test
    describe("transferFrom()",()=>{
        
        let allowanceAmount, transferAmount

        // normal transferFrom test
        it("normal transferFrom",async()=>{

            allowanceAmount = defaultAmount;
            transferAmount = smallAmount;
            const initialOwnerBalance = await token.balanceOf(owner.address);
            const initialReceiverBalance = await token.balanceOf(user2.address);

            await token.approve(user1.address,allowanceAmount);
            expect(
                await token.allowance(owner.address,user1.address)    
            ).to.equal(allowanceAmount);

            await token.connect(user1).transferFrom(owner.address,user2.address,transferAmount);
            expect(
                await token.balanceOf(owner.address)
            ).to.equal(initialOwnerBalance-transferAmount);
            expect(
                await token.balanceOf(user2.address)
            ).to.equal(initialReceiverBalance+transferAmount);
            expect(
                await token.allowance(owner.address,user1.address)
            ).to.equal(allowanceAmount-transferAmount);

        });

          // Transfer event test
        it("emits Transfer event",async()=>{
            
            allowanceAmount = defaultAmount;
            transferAmount = smallAmount;

            await token.approve(user1.address,allowanceAmount);

            await expect(
                token.connect(user1).transferFrom(owner.address,user2.address,transferAmount)
            ).to.emit(token,"Transfer")
            .withArgs(owner.address,user2.address,transferAmount);
            
        });

        // abnormal transferFrom(insufficient owner balance) test
        it("insufficient owner balance",async()=>{
            
            allowanceAmount = bigAmount;
            transferAmount = bigAmount;

            await token.approve(user1.address,allowanceAmount);
            expect(
                await token.allowance(owner.address,user1.address)    
            ).to.equal(allowanceAmount);

            await expect(
                token.connect(user1).transferFrom(owner.address,user2.address,transferAmount)
            ).to.be.revertedWithCustomError(token,"ERC20InsufficientBalance");

        });

        // abnormal transferFrom(insufficient allowance) test
        it("insufficient allowance",async()=>{

            allowanceAmount= smallAmount;
            transferAmount = defaultAmount;

            await token.approve(user1.address,allowanceAmount);
            expect(
                await token.allowance(owner.address,user1.address)    
            ).to.equal(allowanceAmount);

            await expect(
                token.connect(user1).transferFrom(owner.address,user2.address,transferAmount)
            ).to.be.revertedWithCustomError(token,"ERC20InsufficientAllowance");

        });

    });

});