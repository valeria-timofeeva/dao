
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import { ethers, network } from "hardhat";
import { beforeEach } from "mocha";
import { DAO } from "../typechain";

describe("Dao governance", function () {
  let clean: any;
  let daoContract: DAO;
  let chairperson: SignerWithAddress, user1: SignerWithAddress, user2: SignerWithAddress;
  let proposalCallData: string;

  const TOTAL_SUPPLY = parseUnits("10000");
  const QUORUM_PERCENT = BigNumber.from(75);
  const VOTES: BigNumber = calculateQuorum(QUORUM_PERCENT, TOTAL_SUPPLY);
  const PERIOD = BigNumber.from(60 * 60 * 24); // One day
  const PROPOSAL_DESCRIPTION = "Invest treasure funds";

  before(async () => {
    [chairperson, user1, user2] = await ethers.getSigners();

    const DaoFactory = await ethers.getContractFactory("Dao");
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
  describe("Deploy", function () {
    describe("#constructor()", function () {
      it("Should setup initial parameters correctly", async () => {
        expect(await daoContract.debatingPeriodDuration()).to.be.equal(PERIOD);
        expect(await daoContract.chairperson()).to.be.equal(chairperson.address);
        expect(await daoContract.minimumQuorum()).to.be.equal(
          calculateQuorum(QUORUM_PERCENT, TOTAL_SUPPLY)
        );
      });
    });
  });
});