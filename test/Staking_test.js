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

        const MINTER_ROLE = await token.MINTER_ROLE();
        await token.grantRole(MINTER_ROLE,staking.target);
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
            const approvalAmount = smallAmount;

            await token.approve(staking.target,approvalAmount);
            await expect(
                staking.stake(stakeAmount)
            ).to.be.revertedWithCustomError(token,"ERC20InsufficientAllowance");

        });

    });
    
    // finalizeReward() test
    describe("finalizeReward()",()=>{

        const stakeAmount = smallAmount;

        afterEach(async()=>{
            await network.provider.send("evm_setAutomine", [true]);
        });

        // normal finialize
        it("finalize reward",async()=>{

            await token.approve(staking.target,stakeAmount);
            await staking.stake(stakeAmount);
            expect(
                await staking.getStaked(owner)
            ).to.be.equal(stakeAmount);
            
            // freeze timestamp so reward is calculated for exactly 1 block
            await network.provider.send("evm_setAutomine", [false]);

            const beforeBalance = await token.balanceOf(owner.address);
            const REWARD_RATE_PER_SECOND = await staking.REWARD_RATE_PER_SECOND();
            const expectReward = (stakeAmount*3600n*REWARD_RATE_PER_SECOND)/(10n**18n);

            // 1hour delay
            await network.provider.send("evm_increaseTime", [3600]);

            await staking.finalizeReward();

            // block creation after finalizeReward()
            await network.provider.send("evm_mine");

            await network.provider.send("evm_setAutomine", [true]);

            expect(
                await token.balanceOf(owner.address)
            ).to.be.equal(beforeBalance+expectReward);

        });

        // no rewards
        it("revert when there's no staked reward",async()=>{

            await expect(
                staking.finalizeReward()
            ).to.be.revertedWithCustomError(staking,"NotEnoughReward")
            .withArgs(owner.address);
        });

        // finalizeReward event test
        it("emit event when finalize Reward",async()=>{

            await token.approve(staking.target,stakeAmount);
            await staking.stake(stakeAmount);
            expect(
                await staking.getStaked(owner)
            ).to.be.equal(stakeAmount);

            // 1hour delay
            await network.provider.send("evm_increaseTime", [3600]);

            await expect(
                staking.finalizeReward()
            ).to.emit(staking,"FinalizeReward");
            expect(
                await staking.getReward(owner.address)
            ).to.be.equal(0n);
            
        });

    });

    // unstake() test
    describe("unstake()", ()=>{

        const stakeAmount = defaultAmount;

        beforeEach(async()=>{
            
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

            await staking.unstake(stakeAmount);
            expect(
                await token.balanceOf(owner.address)
            ).to.be.equal(balance+stakeAmount);
            expect(
                await staking.getStaked(owner.address)
            ).to.be.equal(staked-stakeAmount);
        });

        // unstake event test
        it("emit Unstake event",async()=>{

            await expect(
                staking.unstake(stakeAmount)
            ).to.emit(staking,"Unstake")
            .withArgs(owner.address,stakeAmount);
        
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