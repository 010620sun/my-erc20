const {ethers} = require("hardhat");
const {expect} = require("chai");

describe("Staking",()=>{

    let token, staking, owner, user1, user2;
    const initialSupply = ethers.parseUnits("1.0", 18);
    const defaultAmount = initialSupply;
    const smallAmount = ethers.parseUnits("0.1", 18);
    const bigAmount = ethers.parseUnits("10", 18);

    beforeEach(async()=>{

        [owner,user1,user2] = await ethers.getSigners();

        const Token = await ethers.getContractFactory("MyToken");
        const Staking = await ethers.getContractFactory("Staking");

        token = await Token.deploy(initialSupply);
        staking = await Staking.deploy(token.target);

    });

    // stake() test
    describe("stake()",()=>{

        let stakeAmount;
        // normal stake test
        it("normal stake",async()=>{

            stakeAmount=smallAmount;

            await token.approve(staking.target,stakeAmount);
            await staking.stake(stakeAmount);
            expect(
                await staking.getStaked(owner)
            ).to.be.equal(stakeAmount);

        });

        // stake event test
        it("stake event",async()=>{

            stakeAmount=smallAmount;

            await token.approve(staking.target,stakeAmount);
            await expect(
                staking.stake(stakeAmount)
            ).to.emit(staking,"Stake")
            .withArgs(owner.address,stakeAmount);

        });

        // abnormal stake(insufficient balance to stake) test
        it("revert when there's insufficient balance to stake",async()=>{

            stakeAmount=bigAmount;

            await token.approve(staking.target,stakeAmount);
            await expect(
                staking.stake(stakeAmount)
            ).to.be.revertedWithCustomError(token,"ERC20InsufficientBalance");

        });

        // abnormal stake(insufficient approval) test
        it("revert when there's insufficient approval to stake",async()=>{

            stakeAmount = defaultAmount;
            const apporvalAmount = smallAmount;

            await token.approve(staking.target,apporvalAmount);
            await expect(
                staking.stake(stakeAmount)
            ).to.be.revertedWithCustomError(token,"ERC20InsufficientAllowance");

        });

    });

    // updateReward() test
    describe("updateReward()",()=>{

        let stakeAmount;

        // reward increase check
        it("reward increases over time",async()=>{

            stakeAmount=smallAmount;
            const expected = smallAmount * 86400n / (365n * 86400n);

            await token.approve(staking.target,smallAmount);
            await staking.stake(smallAmount);
            expect(
                await staking.getReward(owner.address)
            ).to.be.equal(0n);

            await ethers.provider.send("evm_increaseTime", [86400]); 
            await ethers.provider.send("evm_mine");
            
            await staking.updateReward();
            expect(
                await staking.getReward(owner.address)
            ).to.be.greaterThan(0n);

            });

    });
    
    // finalizeReward() test
    describe("finalizeReward()",()=>{

        let stakeAmount;

        beforeEach(async()=>{

            const MINTER_ROLE = await token.MINTER_ROLE();

            await token.grantRole(MINTER_ROLE,staking.target);

        });

        // normal finialize
        it("finalize reward",async()=>{

            stakeAmount = smallAmount;

            await token.approve(staking.target,smallAmount);
            await staking.stake(smallAmount);
            expect(
                await staking.getStaked(owner)
            ).to.be.equal(smallAmount);

            await staking.updateReward();
            const reward = await staking.getReward(owner.address);
            const balance = await token.balanceOf(owner.address);

            await staking.finalizeReward();
            expect(
                await staking.getReward(owner.address)
            ).to.be.equal(0n);
            expect(
                await token.balanceOf(owner.address)
            ).to.be.equal(balance+reward);

        });

        // no rewards
        it("revert when there's no stake reward",async()=>{

            await staking.updateReward();
            await expect(
                staking.finalizeReward()
            ).to.be.revertedWithCustomError(staking,"NotEnoughReward")
            .withArgs(owner.address);

        });

        // finalizeReward event test
        it("emit event when finalize Reward",async()=>{

            stakeAmount = smallAmount;

            await token.approve(staking.target,smallAmount);
            await staking.stake(smallAmount);
            expect(
                await staking.getStaked(owner)
            ).to.be.equal(smallAmount);

            await staking.updateReward();
            const reward = await staking.getReward(owner.address);

            await expect(
                staking.finalizeReward()
            ).to.emit(staking,"FinalizeReward")
            .withArgs(owner.address,reward);

        });

    });

    // unstake() test
    describe("unstake()", ()=>{

        beforeEach(async()=>{

            const stakeAmount = defaultAmount;
            
            await token.approve(staking.target,stakeAmount);
            await staking.stake(stakeAmount);
            expect(
                await staking.getStaked(owner)
            ).to.be.equal(stakeAmount);

        });

        // normal unstake test
        it("normal unstake",async()=>{
            
            const balance = await token.balanceOf(owner.address);
            const staked = await staking.getStaked(owner.address);

            await staking.unstake(smallAmount);
            expect(
                await token.balanceOf(owner.address)
            ).to.be.equal(balance+smallAmount);
            expect(
                await staking.getStaked(owner.address)
            ).to.be.equal(staked-smallAmount);
        });

        // unstake event test
        it("emit Unstake event",async()=>{

            await expect(
                staking.unstake(defaultAmount)
            ).to.emit(staking,"Unstake")
            .withArgs(owner.address,defaultAmount);
        
        });

        // abnormal unstake(insufficient stkaed to unstake) test
        it("revert when there's insufficient staked to unstake",async()=>{

            const staked = await staking.getStaked(owner.address);

            await expect(
                staking.unstake(bigAmount)
            ).to.be.revertedWithCustomError(staking,"NotEnoughStaked")
            .withArgs(owner.address,bigAmount,staked);

        });

    });

})