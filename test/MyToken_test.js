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
        it("emits Trsansfer event",async()=>{

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

    // mint() test
    describe("mint()",()=>{

        let mintAmount;

        // mint to owner
        it("mint to owner", async()=>{
            
            mintAmount = ethers.parseUnits("1.0", 18);
            const initialOwnerBalance = await token.balanceOf(owner.address);

            await token.mint(owner.address,mintAmount);
            expect(
                await token.totalSupply()
            ).to.equal(initialSupply+mintAmount);
            expect(
                await token.balanceOf(owner.address)
            ).to.equal(initialOwnerBalance+mintAmount);
        });

        // mint to user
        it("mint to user",async()=>{

            mintAmount = ethers.parseUnits("1.0", 18);
            const initialUserBalance = await token.balanceOf(user1.address);

            await token.mint(user1.address,mintAmount);
            expect(
                await token.totalSupply()
            ).to.equal(initialSupply+mintAmount);
            expect(
                await token.balanceOf(user1.address)
            ).to.equal(initialUserBalance+mintAmount);
        });

        // abnormal mint(no Access to mint) test
        it("no Access to mint",async()=>{

            mintAmount = ethers.parseUnits("1.0", 18);
            const MINTER_ROLE = await token.MINTER_ROLE();

            await expect(
                token.connect(user1).mint(user1.address,mintAmount)
            ).to.be.revertedWithCustomError(token,"AccessControlUnauthorizedAccount")
            .withArgs(user1.address,MINTER_ROLE);

        });

    });

    // burn() test
    describe("burn()",()=>{

        let burnAmount; 

        // burn to owner
        it("burn to owner",async()=>{

            burnAmount = ethers.parseUnits("0.1", 18);
            const initialOwnerBalance = await token.balanceOf(owner.address);

            await token.burn(owner.address,burnAmount);
            expect(
                await token.totalSupply()
            ).to.equal(initialSupply-burnAmount);
            expect(
                await token.balanceOf(owner.address)
            ).to.equal(initialOwnerBalance-burnAmount);
             
        });

        // burn to suer
        it("burn to user",async()=>{

            burnAmount = ethers.parseUnits("0.1", 18);

            // transfer token to prevent occuring unsufficient balance error
            await token.transfer(user1.address,burnAmount);
            const userBalance = await token.balanceOf(user1.address);

            await token.burn(user1.address,burnAmount);
            expect(
                await token.totalSupply()
            ).to.equal(initialSupply-burnAmount);
            expect(
                await token.balanceOf(user1.address)
            ).to.equal(userBalance-burnAmount);

        });

        // abnormal burn(not enough balance to burn) test
        it("not enough balance to burn",async()=>{

            burnAmount = ethers.parseUnits("10", 18);

            await expect(
                token.burn(owner.address,burnAmount)
            ).to.be.revertedWithCustomError(token,"ERC20InsufficientBalance");

        });

        // abnormal burn(no access to burn) test
        it("no access to burn",async()=>{

            burnAmount = ethers.parseUnits("0.1", 18);
            const BURNER_ROLE = await token.BURNER_ROLE();

            await expect(
                token.connect(user1).burn(owner.address,burnAmount)
            ).to.be.revertedWithCustomError(token,"AccessControlUnauthorizedAccount")
            .withArgs(user1.address,BURNER_ROLE);

        });

    });

    // airdrop() test
    describe("airdrop()",()=>{

        let receivers, airdropAmount;

        beforeEach(async()=>{

            receivers= [user1.address,user2.address];

        });

        // normal airdrop test
        it("normal airdrop", async()=>{

            const initialOwnerBalance = await token.balanceOf(owner.address);
            airdropAmount = ethers.parseUnits("0.01", 18);
            const totalAmount = airdropAmount * BigInt(receivers.length);
            const beforeBalances = await Promise.all(receivers.map(r=>token.balanceOf(r)));
            
            await token.airdrop(receivers,airdropAmount);

            const afterBalances = await Promise.all(receivers.map(r=>token.balanceOf(r)));

            expect(
                await token.balanceOf(owner.address)
            ).to.equal(initialOwnerBalance-totalAmount);
            expect(afterBalances).to.deep.equal(beforeBalances.map(r=>r+airdropAmount));

        });

        // Transfer event test
        it("emits transfer events",async()=>{
            
            airdropAmount = ethers.parseUnits("0.01", 18);

            const tx = await token.airdrop(receivers,airdropAmount);
            
            for(let r of receivers){
                await expect(tx).to.emit(token,"Transfer").withArgs(owner.address,r,airdropAmount);
            }

        });

        // abnormal airdrop(unsufficient balance) test
        it("unsufficient balance",async()=>{
            
            airdropAmount = ethers.parseUnits("1.0", 18);

            await expect(
                token.airdrop(receivers,airdropAmount)
            ).to.be.revertedWithCustomError(token,"ERC20InsufficientBalance");

        });

    });

});