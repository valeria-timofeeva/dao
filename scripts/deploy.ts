import { parseUnits } from "ethers/lib/utils";
import { ethers } from "hardhat";
import * as fs from "fs";

async function main() {

  const Dao = await ethers.getContractFactory("Dao");
  const dao = await Dao.deploy(60, 43200,parseUnits("10000"));
  await dao.deployed();

  const contract = {
    daoAddress: dao.address,
  };

  const filePath = "./tasks/deploy.json";

  fs.writeFile(filePath, JSON.stringify(contract), (err) => {
    console.log(err);
    if (err) throw err;
  });

  console.log("Contracts deployed", contract);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});