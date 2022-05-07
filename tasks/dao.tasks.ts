import { task } from "hardhat/config";

const contractInfo = require("./deploy.json");

task("stake", "deposit dao tokens")
    .addParam("amount", "amount of deposit")
    .setAction(async (taskArgs, hre) => {
        const contract = await hre.ethers.getContractAt("DAO", contractInfo.daoAddress);
        await contract.stake(taskArgs.amount);
    });

task("vote", "proposal vote")
    .addParam("id", "id of proposal")
    .addParam("vote", "for or against")
    .setAction(async (taskArgs, hre) => {
        const contract = await hre.ethers.getContractAt("DAO", contractInfo.daoAddress);
        await contract.vote(taskArgs.id, taskArgs.vote);
    });

task("AddProposal", "add proposal")
    .addParam("calldata", "instruction to execute")
    .addParam("recipient", "address of recipient")
    .addParam("description", "description of proposal")
    .setAction(async (taskArgs, hre) => {
        const contract = await hre.ethers.getContractAt("DAO", contractInfo.daoAddress);
        await contract.addProposal(taskArgs.calldata, taskArgs.recipient, taskArgs.description);
    });

task("finishProposal", "finish proposal")
    .addParam("id", "Id of proposal")
    .setAction(async (taskArgs, hre) => {
        const contract = await hre.ethers.getContractAt("DAO", contractInfo.daoAddress);
        await contract.finishProposal(taskArgs.id);
    });