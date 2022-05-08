
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import { ethers, network } from "hardhat";
import { DAO } from "../typechain";
import { Token } from "../typechain";

describe("Dao governance", function () {
  let clean: any;
  let daoContract: DAO;
  let token: Token;
  let chairperson: SignerWithAddress, user1: SignerWithAddress, user2: SignerWithAddress;
  let proposalCallData: string;

  const TOTAL_SUPPLY = parseUnits("10000");
  const QUORUM_PERCENT = BigNumber.from(60);
  const PERIOD = BigNumber.from(43200);
  const DESCRIPTION = "Dao description";

  before(async () => {
    [chairperson, user1, user2] = await ethers.getSigners();

    const DaoFactory = await ethers.getContractFactory("DAO");
    daoContract = await DaoFactory.deploy(QUORUM_PERCENT, PERIOD, TOTAL_SUPPLY);
    await daoContract.deployed();

    const Token = await ethers.getContractFactory("Token");
    token = await Token.deploy();
    await token.deployed();

    proposalCallData = token.interface.encodeFunctionData("mint", [user1.address, 100]);
    clean = await network.provider.send("evm_snapshot");
  });

  afterEach(async () => {
    await network.provider.send("evm_revert", [clean]);
    clean = await network.provider.send("evm_snapshot");
  });

  async function networkWait(seconds: number) {
    await network.provider.send("evm_increaseTime", [seconds]);
    await network.provider.send("evm_mine", []);
  }

  function calculateQuorum(percent: BigNumber, token: BigNumber): BigNumber {
    let zero = BigNumber.from("0");
    if (percent.eq(zero)) {
      return zero;
    } else {
      return token.mul(percent).div(100);
    }
  }
  describe("Config functions", function () {
    describe("", function () {
      it("Set parameters", async () => {
        expect(await daoContract.debatingPeriodDuration()).to.be.equal(PERIOD);
        expect(await daoContract.chairperson()).to.be.equal(chairperson.address);
        expect(await daoContract.minimumQuorum()).to.be.equal(
          calculateQuorum(QUORUM_PERCENT, TOTAL_SUPPLY)
        );
      });
    });

    describe("setQuorum", function () {
      it("Should set quorum", async () => {
        await expect(daoContract.connect(user1).setMinimumQuorum(BigNumber.from("0"))).to.be.revertedWith("NotChairperson");

        await expect(daoContract.setMinimumQuorum(BigNumber.from(101))).to.be.revertedWith(
          "IncorrectQuorum");

        await daoContract.setMinimumQuorum(BigNumber.from("0"));
        expect(await daoContract.minimumQuorum()).to.be.equal(
          calculateQuorum(BigNumber.from("0"), TOTAL_SUPPLY)
        );
      });
    });
    describe("setDebatingPeriod", function () {
      it("Should set debating period", async () => {
        await expect(daoContract.connect(user1).setDebatingPeriod(BigNumber.from("50000"))).to.be.revertedWith("NotChairperson");

        await daoContract.setDebatingPeriod(BigNumber.from("50000"));
        expect(await daoContract.debatingPeriodDuration()).to.be.equal("50000");
      });
    });
  });

  describe("Staking", function () {
    const deposit = parseUnits("100");
    describe("stake", async () => {
      it("Should accept deposit", async function () {
        await expect(daoContract.stake(deposit))
          .to.emit(daoContract, "Staked")
          .withArgs(chairperson.address, deposit);

        expect(await daoContract.balanceOf(chairperson.address)).to.be.equal(TOTAL_SUPPLY.sub(deposit));
        expect((await daoContract.votingPower(chairperson.address)).amount).to.be.equal(deposit);
      });
    });

    describe("withdraw", async () => {
      it("Should withdraw tokens", async function () {
        await daoContract.stake(deposit);
        await expect(daoContract.withdraw())
          .to.emit(daoContract, "Withdrawn")
          .withArgs(chairperson.address, deposit);

        expect((await daoContract.votingPower(chairperson.address)).amount).to.be.equal(0);
        expect(await daoContract.balanceOf(chairperson.address)).to.be.equal(TOTAL_SUPPLY);
      });
    });
  });

  describe("Voting", function () {
    describe("addProposal", function () {
      it("Only chairperson", async () => {
        await expect(
          daoContract
            .connect(user1)
            .addProposal(proposalCallData, token.address, DESCRIPTION)
        ).to.be.reverted;
      });
    });

    describe("vote", function () {
      it("Reverts: no such proposal, already voted", async () => {
        await daoContract.stake(parseUnits("1000"));
        await daoContract.addProposal(proposalCallData, token.address, DESCRIPTION);

        await expect(daoContract.vote(1, true)).to.be.revertedWith("ProposalNotExist");
        await daoContract.vote(0, true);
        await expect(daoContract.vote(0, false)).to.be.revertedWith("AlreadyVoted");
      });

      it("Reverts: voting period is over", async () => {
        await daoContract.stake(parseUnits("1000"));
        await daoContract.addProposal(proposalCallData, token.address, DESCRIPTION);

        await networkWait(PERIOD.toNumber());
        await expect(daoContract.vote(0, true)).to.be.revertedWith("VotingFinished");
      });

      it("Should vote", async () => {
        await daoContract.stake(parseUnits("1000"));
        await daoContract.addProposal(proposalCallData, token.address, DESCRIPTION);

        await expect(daoContract.vote(0, true))
          .to.emit(daoContract, "Voted")
          .withArgs(0, chairperson.address, true);

        await daoContract.setDebatingPeriod(3600);
        await daoContract.addProposal(proposalCallData, token.address, "New proposal");
        await expect(daoContract.vote(1, false)).to.be.not.reverted;
      });
    });

    describe("finishProposal", function () {
      it("Events: no such proposal, debating in progress, quorum failed", async () => {
        await daoContract.stake(parseUnits("1000"));
        await daoContract.addProposal(proposalCallData, token.address, DESCRIPTION);

        await expect(daoContract.finishProposal("70")).to.be.revertedWith("ProposalNotExist");
        await expect(daoContract.finishProposal(0)).to.be.revertedWith(
          "VotingProcess"
        );
        await networkWait(PERIOD.toNumber());
        await expect(daoContract.finishProposal(0))
          .to.emit(daoContract, "ProposalFinished")
          .withArgs(0, false);

        await daoContract.addProposal(proposalCallData, token.address, DESCRIPTION);

        await daoContract.stake(parseUnits("5000"));
        await daoContract.vote(1, true);
        await networkWait(PERIOD.toNumber());

        await expect(daoContract.finishProposal(1))
          .to.emit(daoContract, "ProposalFinished")
          .withArgs(1, true);
      });

      it("Should be finished", async () => {
        await daoContract.stake(parseUnits("1000"));
        await daoContract.addProposal(proposalCallData, token.address, DESCRIPTION);

        await daoContract.vote(0, true);
        await networkWait(PERIOD.toNumber());

        await expect(daoContract.finishProposal(0))
          .to.emit(daoContract, "ProposalFinished")
          .withArgs(0, true);
      });
    });
  });
});
