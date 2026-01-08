const {ethers} = require("hardhat");
const {expect} = require("chai");

describe("Staking",()=>{

    let token,tokenManager,staking;
    let deployer,multisig,user;
    const initialSupply = ethers.parseUnits("10",18);
    const defaultAmount = ethers.parseUnits("1.0",18);

    // contract deployment & basic role setting
    beforeEach(async()=>{

        [deployer,multisig,user] = await ethers.getSigners();

        const Token = await ethers.getContractFactory("MyToken");
        const TokenManager = await ethers.getContractFactory("TokenManager");
        const Staking = await ethers.getContractFactory("Staking");

        // MyTokn deployment
        token = await Token.deploy(initialSupply);
        await token.waitForDeployment();

        // TokenManager deployment(suppose deployer as multisig)
        tokenManager = await TokenManager.deploy(token.target,multisig);
        await tokenManager.waitForDeployment();

        // Staking deployment
        staking = await Staking.deploy(token.target,tokenManager.target);
        await staking.waitForDeployment();

        const DEFAULT_ADMIN_ROLE = await token.DEFAULT_ADMIN_ROLE();

        // let TokenManager be manager of MyToken
        await token.grantRole(DEFAULT_ADMIN_ROLE,tokenManager.target);
        // deprive token admin role of deployer
        await token.renounceRole(DEFAULT_ADMIN_ROLE, deployer);

        const MINTER_ROLE = await tokenManager.MINTER_ROLE();
        const BURNER_ROLE = await tokenManager.BURNER_ROLE();
        const PAUSER_ROLE = await tokenManager.PAUSER_ROLE();

        // set role managers 
        await tokenManager.connect(multisig).grantRole(MINTER_ROLE,multisig);
        await tokenManager.connect(multisig).grantRole(BURNER_ROLE,multisig);
        await tokenManager.connect(multisig).grantRole(PAUSER_ROLE,multisig);

        // grant minter role to staking contract
        await tokenManager.connect(multisig).grantRole(MINTER_ROLE,staking.target);

    });

    // stake test
    describe("stake()",()=>{

        let stakeAmount, allowanceAmount;

        // normal stake()
        it("normal stake",async()=>{

            stakeAmount = defaultAmount;
            allowanceAmount = defaultAmount;
            const initialDeployerBalance = await token.balanceOf(deployer.address);

            // approve before stake
            await token.approve(staking.target,allowanceAmount);

            await staking.stake(stakeAmount);

            expect(
                await staking.getStaked(deployer.address)
            ).to.be.equal(stakeAmount);
            expect(
                await token.balanceOf(deployer.address)
            ).to.be.equal(initialDeployerBalance-stakeAmount);
            expect(
                await token.allowance(deployer.address,staking.target)
            ).to.be.equal(allowanceAmount-stakeAmount);

        });

        // event test when stake
        it("emits Stake & Transfer events when stake", async()=>{

            stakeAmount = defaultAmount;
            allowanceAmount = defaultAmount;

            // approve before stake
            await token.approve(staking.target,allowanceAmount);

            await expect(
                staking.stake(stakeAmount)
            ).to.emit(staking,"Stake")
            .withArgs(deployer.address,stakeAmount).and
            .to.emit(token,"Transfer")
            .withArgs(deployer.address,staking.target,stakeAmount);

        });

        // revert test(insufficient allowance)
        it("reverts due to insufficient allowance to staking contract",async()=>{

            stakeAmount = initialSupply;
            allowanceAmount = defaultAmount;

            await token.approve(staking.target,allowanceAmount);

            await expect(
                staking.stake(stakeAmount)
            ).to.be.revertedWithCustomError(token,"ERC20InsufficientAllowance")
            .withArgs(staking.target,allowanceAmount,stakeAmount);

        });


        // revert test(insufficient balance)
        it("reverts due to insufficient balance of staker",async()=>{
            
            stakeAmount = ethers.parseUnits("100",18);
            allowanceAmount = stakeAmount;

            const initialDeployerBalance = await token.balanceOf(deployer.address);

            await token.approve(staking.target,allowanceAmount);

            await expect(
                staking.stake(stakeAmount)
            ).to.be.revertedWithCustomError(token,"ERC20InsufficientBalance")
            .withArgs(deployer.address,initialDeployerBalance,stakeAmount);

        });

        // revert test(paused state)
        it("reverts when state of token is paused",async()=>{

            stakeAmount = defaultAmount
            // approve before pause
            await token.approve(staking.target,stakeAmount);

            // execute pause
            await tokenManager.connect(multisig).pause();

            await expect(
                staking.stake(stakeAmount)
            ).to.be.revertedWithCustomError(token,"EnforcedPause");

        });

    });

    // unstake test
    describe("unstake()",()=>{

        let stakeAmount;

        // stake before unstake test
        beforeEach(async()=>{

            stakeAmount = defaultAmount;
            await token.approve(staking.target,defaultAmount);
            await staking.stake(defaultAmount);

        });

        // normal unstake()
        it("normal unstake", async()=>{

            const beforeDeployerBalance = await token.balanceOf(deployer.address);
            const befroeStakingBalace = await token.balanceOf(staking.target);
            const beforeStaked = await staking.getStaked(deployer.address);

            await staking.unstake(stakeAmount);

            expect(
                await token.balanceOf(deployer.address)
            ).to.be.equal(beforeDeployerBalance+stakeAmount);
            expect(
                await token.balanceOf(staking.target)
            ).to.be.equal(befroeStakingBalace-stakeAmount);
            expect(
                await staking.getStaked(deployer.address)
            ).to.be.equal(beforeStaked-stakeAmount);
            
        });

        // event test when unstake
        it("emits Unstake & Transfer events when unstake",async()=>{

            await expect(
                staking.unstake(stakeAmount)
            ).to.emit(staking,"Unstake")
            .withArgs(deployer.address,stakeAmount).and
            .to.emit(token,"Transfer")
            .withArgs(staking.target,deployer.address,stakeAmount);

        });

        // revert test(insufficient staked)
        it("rerverts due to insufficient staked amount for unstake",async()=>{

            const unstakeAmount = initialSupply;

            await expect(
                staking.unstake(unstakeAmount)
            ).to.be.revertedWithCustomError(staking,"NotEnoughStaked")
            .withArgs(deployer.address,unstakeAmount,stakeAmount);

        });

        // revert test(paused state)
        it("reverts when token state is paused",async()=>{

            // execute pause
            await tokenManager.connect(multisig).pause();

            await expect(
                staking.unstake(stakeAmount)
            ).to.be.revertedWithCustomError(token,"EnforcedPause");

        });

    });

    // finalizeReward test
    describe("finalizeReward()",()=>{

        let stakeAmount;

        // normal finializeReward()
        it("normal finalizeReward",async()=>{

            stakeAmount = defaultAmount;

            await token.approve(staking.target,stakeAmount);
            await staking.stake(stakeAmount);

            const block = await ethers.provider.getBlock("latest");

            // next block timestamp should be after a hour
            await network.provider.send("evm_setNextBlockTimestamp", [
            block.timestamp + 3600
            ]);

            const beforeDeployerBalance = await token.balanceOf(deployer.address);
            const beforeReward = await staking.getReward(deployer.address);
            const REWARD_RATE_PER_SECOND = await staking.REWARD_RATE_PER_SECOND();
            const expectReward = (stakeAmount*3600n*REWARD_RATE_PER_SECOND)/(10n**18n);
            const totalReward = beforeReward + expectReward;

            // block should be mined at this point
            const tx = await staking.finalizeReward();
            await tx.wait();

            expect(
                await token.balanceOf(deployer.address)
            ).to.be.equal(beforeDeployerBalance+totalReward);
            expect(
                await staking.getReward(deployer.address)
            ).to.be.equal(0n);
            expect(
                await token.totalSupply()
            ).to.be.equal(initialSupply+totalReward);

        });

        // finalize event test
        it("emits Finalize & Transfer events when finalize reaward",async()=>{

            stakeAmount = defaultAmount;

            await token.approve(staking.target,stakeAmount);
            await staking.stake(stakeAmount);

            const block = await ethers.provider.getBlock("latest");

            // next block timestamp should be after a hour
            await network.provider.send("evm_setNextBlockTimestamp", [
            block.timestamp + 3600
            ]);

            const beforeReward = await staking.getReward(deployer.address);
            const REWARD_RATE_PER_SECOND = await staking.REWARD_RATE_PER_SECOND();
            const expectReward = (stakeAmount*3600n*REWARD_RATE_PER_SECOND)/(10n**18n);
            const totalReward = beforeReward + expectReward;

            // block should be mined at this point
            const tx = await staking.finalizeReward();
            await tx.wait();

            const blocknumber = block.number+1;

            const transferEvent = await token.queryFilter(
                token.filters.Transfer(ethers.ZeroAddress,deployer.address),
                blocknumber,
                blocknumber
            );

            const finalizeRewardEvent =  await staking.queryFilter(
                staking.filters.FinalizeReward(),
                blocknumber,
                blocknumber
            );

            // verify each event occur only once
            expect(transferEvent.length).to.equal(1);
            expect(finalizeRewardEvent.length).to.equal(1);

            expect(transferEvent[0].args).
            to.deep.equal([ethers.ZeroAddress,deployer.address,totalReward]);
            expect(finalizeRewardEvent[0].args).
            to.deep.equal([deployer.address,totalReward]);

        });

        // revert test(insufficient reward)
        it("reverts due to insufficient reward",async()=>{
            
            await expect(
                staking.finalizeReward()
            ).to.be.revertedWithCustomError(staking,"NotEnoughReward")
            .withArgs(deployer.address);

        });

    });

})