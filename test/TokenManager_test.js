const {ethers} = require("hardhat");
const {expect} = require("chai");

describe("TokenManager",()=>{

    let token,tokenManager,staking;
    let deployer,multisig,user;
    const initialSupply = ethers.parseUnits("10",18);
    const defaultAmount = ethers.parseUnits("1.0",18);

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

        await tokenManager.connect(multisig).grantRole(MINTER_ROLE,multisig);
        await tokenManager.connect(multisig).grantRole(BURNER_ROLE,multisig);
        await tokenManager.connect(multisig).grantRole(PAUSER_ROLE,multisig);

    });

    // pause test
    describe("pause()",()=>{

        // normal pause()
        it("normal pause",async()=>{

            // approve for TransferFrom
            await token.approve(user.address,defaultAmount);

            // execute pause()
            await tokenManager.connect(multisig).pause();

            // state check
            expect(
                await token.paused()
            ).to.be.equal(true);

            // transfer occur revert when puased
            await expect(
                token.transfer(user.address,defaultAmount)
            ).to.be.revertedWithCustomError(token,"EnforcedPause");

            // transferfrom occur revert when paused
            await expect(
                token.connect(user).transferFrom(deployer.address,user.address,defaultAmount)
            ).to.be.revertedWithCustomError(token,"EnforcedPause");

            // approve occur revert when paused
            await expect(
                token.approve(user.address,defaultAmount)
            ).to.be.revertedWithCustomError(token,"EnforcedPause");

            // mint occur revert when paused
            await expect(
                tokenManager.connect(multisig).mint(user.address,defaultAmount)
            ).to.be.revertedWithCustomError(token,"EnforcedPause");

            // burn occur revert when paused
            await expect(
                tokenManager.connect(multisig).burn(deployer.address,defaultAmount)
            ).to.be.revertedWithCustomError(token,"EnforcedPause");

            const receivers = [multisig.address,user.address];

            // airdrop occur revert when paused
            await expect(
                tokenManager.connect(multisig).airdrop(receivers,defaultAmount)
            ).to.be.revertedWithCustomError(token,"EnforcedPause");

            // pause occur revert when paused
            await expect(
                tokenManager.connect(multisig).pause()
            ).to.be.revertedWithCustomError(token,"EnforcedPause");

        });

        // event test when pause
        it("emits Paused event when pause",async()=>{

            await expect(
                tokenManager.connect(multisig).pause()
            ).to.emit(token,"Paused")
            .withArgs(tokenManager.target);

        });

        // revert test(unauthorized address)
        it("reverts when paused by unauthorized address",async()=>{

            const PAUSER_ROLE = await tokenManager.PAUSER_ROLE();

            await expect(
                tokenManager.pause()
            ).to.be.revertedWithCustomError(tokenManager,"AccessControlUnauthorizedAccount")
            .withArgs(deployer.address,PAUSER_ROLE);
        
        });

        // revert test(called by token contract)
        it("reverts when paused by token contract",async()=>{

            const DEFAULT_ADMIN_ROLE = await token.DEFAULT_ADMIN_ROLE();

            await expect(
                token.pause()
            ).to.be.revertedWithCustomError(token,"AccessControlUnauthorizedAccount")
            .withArgs(deployer.address,DEFAULT_ADMIN_ROLE);

        });

    });

    // unpause test
    describe("upause()",()=>{

        // execute pause() before unpause() test
        beforeEach(async()=>{

            await tokenManager.connect(multisig).pause();
        });

        // normal unpause()
        it("normal unpause",async()=>{

            // execute unpause
            await tokenManager.connect(multisig).unpause();

            // state check
            expect(
                await token.paused()
            ).to.be.equal(false);

            // unpause reverts when token is not paused
            await expect(
                tokenManager.connect(multisig).unpause()
            ).to.be.revertedWithCustomError(token,"ExpectedPause");

        });

        // event test when unpause
        it("emits Unpaused event when pause",async()=>{

            await expect(
                tokenManager.connect(multisig).unpause()
            ).to.emit(token,"Unpaused")
            .withArgs(tokenManager.target);

        });

        // revert test(unauthorized address)
        it("reverts when unpaused by unauthorized address",async()=>{

            const DEFAULT_ADMIN_ROLE = await tokenManager.DEFAULT_ADMIN_ROLE();

            await expect(
                tokenManager.unpause()
            ).to.be.revertedWithCustomError(tokenManager,"AccessControlUnauthorizedAccount")
            .withArgs(deployer.address,DEFAULT_ADMIN_ROLE);
        
        });

        // revert test(called by token contract)
        it("reverts when unpaused by token contract",async()=>{

            const DEFAULT_ADMIN_ROLE = await token.DEFAULT_ADMIN_ROLE();

            await expect(
                token.unpause()
            ).to.be.revertedWithCustomError(token,"AccessControlUnauthorizedAccount")
            .withArgs(deployer.address,DEFAULT_ADMIN_ROLE);

        });

    });

    // mint test
    describe("mint()",()=>{

        // normal mint()
        it("normal mint",async()=>{

            const initialUserBalance = await token.balanceOf(user.address);

            await tokenManager.connect(multisig).mint(user.address,defaultAmount);

            expect(
                await token.totalSupply()
            ).to.be.equal(initialSupply+defaultAmount);

            expect(
                await token.balanceOf(user.address)
            ).to.be.equal(initialUserBalance+defaultAmount);
        });

        // event test when mint 
        it("emits Transfer event when mint",async()=>{

            await expect(
                tokenManager.connect(multisig).mint(user.address,defaultAmount)
            ).to.emit(token,"Transfer")
            .withArgs(ethers.ZeroAddress,user.address,defaultAmount);

        });

        // revert test(unauthorized address)
        it("reverts when minted by unauthorized address", async()=>{

            const MINTER_ROLE = await tokenManager.MINTER_ROLE();

            await expect(
                tokenManager.mint(user.address,defaultAmount)
            ).to.be.revertedWithCustomError(tokenManager,"AccessControlUnauthorizedAccount")
            .withArgs(deployer.address,MINTER_ROLE);

        });

        // revert test(called by token contract)
        it("reverts when minted by token contract", async()=>{

            const DEFAULT_ADMIN_ROLE = await token.DEFAULT_ADMIN_ROLE();

            await expect(
                token.mint(user.address,defaultAmount)
            ).to.be.revertedWithCustomError(token,"AccessControlUnauthorizedAccount")
            .withArgs(deployer.address,DEFAULT_ADMIN_ROLE);

        });

    });

    // burn test
    describe("burn()",()=>{

        // normal burn()
        it("normal burn",async()=>{

            const initialDeployerBalance = await token.balanceOf(deployer.address);

            await tokenManager.connect(multisig).burn(deployer.address,defaultAmount);

            expect(
                await token.balanceOf(deployer.address)
            ).to.be.equal(initialDeployerBalance-defaultAmount);

            expect(
                await token.totalSupply()
            ).to.be.equal(initialSupply-defaultAmount);
            
        });

        // event test when burn
        it("emits Transfer event when burn", async()=>{

            await expect(
                tokenManager.connect(multisig).burn(deployer.address,defaultAmount)
            ).to.emit(token,"Transfer")
            .withArgs(deployer.address,ethers.ZeroAddress,defaultAmount);

        });

        // revert test(unauthorized address)
        it("reverts when minted by unauthorized address", async()=>{

            const BURNER_ROLE = await tokenManager.BURNER_ROLE();

            await expect(
                tokenManager.burn(deployer.address,defaultAmount)
            ).to.be.revertedWithCustomError(tokenManager,"AccessControlUnauthorizedAccount")
            .withArgs(deployer.address,BURNER_ROLE);

        });

        // revert test(called by token contract)
        it("reverts when minted by token contract", async()=>{

            const DEFAULT_ADMIN_ROLE = await token.DEFAULT_ADMIN_ROLE();

            await expect(
                token.burn(deployer.address,defaultAmount)
            ).to.be.revertedWithCustomError(token,"AccessControlUnauthorizedAccount")
            .withArgs(deployer.address,DEFAULT_ADMIN_ROLE);

        });

        // revert test(not enough balance to burn)
        it("reverts when there's not enough balance to burn", async()=>{

            const initialUserBalance = await token.balanceOf(user.address);

            await expect(
                tokenManager.connect(multisig).burn(user.address,defaultAmount)
            ).to.be.revertedWithCustomError(token,"ERC20InsufficientBalance")
            .withArgs(user.address,initialUserBalance,defaultAmount);

        });

    });

    // airdrop test
    describe("airdrop()",()=>{

        let receivers;
        const smallAmount = ethers.parseUnits("0.1",18);

        beforeEach(async()=>{

            const signers = await ethers.getSigners();
            receivers = signers.slice(3,);
        });

        // normal airdrop()
        it("normal airdrop",async()=>{

            const beforeBalances = await Promise.all(receivers.map(r=>token.balanceOf(r)));
            const totalAmount = smallAmount * BigInt(receivers.length);

            await tokenManager.connect(multisig).airdrop(receivers,smallAmount);

            const afterBalances = await Promise.all(receivers.map(r=>token.balanceOf(r)));
            
            expect(
                await token.totalSupply()
            ).to.equal(initialSupply+totalAmount);

            expect(afterBalances).to.deep.equal(beforeBalances.map(r=>r+smallAmount));
        });

        // event test when airdrop
        it("emits Transfer event when airdrop",async()=>{

            const tx = await tokenManager.connect(multisig).airdrop(receivers,smallAmount);
            const receipt = await tx.wait();
            
            const events = await token.queryFilter(
                token.filters.Transfer(ethers.ZeroAddress),
                receipt.blockNumber,
                receipt.blockNumber
            );

            expect(events.length).to.equal(receivers.length);

            receivers.forEach((receiver, i) => {
                expect(events[i].args.from).to.equal(ethers.ZeroAddress);
                expect(events[i].args.to).to.equal(receiver);
                expect(events[i].args.value).to.equal(smallAmount);
            });

        });

        // revert test(unauthorized address)
        it("reverts when airdrop by unauthorized address",async()=>{
            
            const DEFAULT_ADMIN_ROLE = await tokenManager.DEFAULT_ADMIN_ROLE();

            await expect(
                tokenManager.airdrop(receivers,smallAmount)
            ).to.be.revertedWithCustomError(tokenManager,"AccessControlUnauthorizedAccount")
            .withArgs(deployer.address,DEFAULT_ADMIN_ROLE);

        });

        // revert test(called by token contract)
        it("reverts when airdrop by token contract",async()=>{

            const DEFAULT_ADMIN_ROLE = await token.DEFAULT_ADMIN_ROLE();

            await expect(
                token.airdrop(receivers,smallAmount)
            ).to.be.revertedWithCustomError(token,"AccessControlUnauthorizedAccount")
            .withArgs(deployer.address,DEFAULT_ADMIN_ROLE);

        });

    });

})