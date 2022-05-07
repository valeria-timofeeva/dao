
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import { ethers, network } from "hardhat";
import { DAO } from "../typechain";

describe("Dao governance", function () {
  let clean: any;
  let daoContract: DAO;
  let chairperson: SignerWithAddress, user1: SignerWithAddress, user2: SignerWithAddress;
  let proposalCallData: string;

  const TOTAL_SUPPLY = parseUnits("10000");
  const QUORUM_PERCENT = BigNumber.from(60);
  const VOTES: BigNumber = calculateQuorum(QUORUM_PERCENT, TOTAL_SUPPLY);
  const PERIOD = BigNumber.from(43200);
  const DESCRIPTION = "Dao description";

  before(async () => {
    [chairperson, user1, user2] = await ethers.getSigners();

    const DaoFactory = await ethers.getContractFactory("DAO");
    daoContract = await DaoFactory.deploy(QUORUM_PERCENT, PERIOD, TOTAL_SUPPLY);
    await daoContract.deployed();
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
    const depositAmount = parseUnits("1000");
    describe("stake", async () => {
      it("Should accept deposit", async function () {
      });
    });
  });
});
