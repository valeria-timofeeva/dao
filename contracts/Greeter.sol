//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
    @dev Errors
 */

error NotChairPerson();

/**
    @title smart contract for DAO governance
    @author Valeria Timofeeva
 */
contract DAO is ERC20 {
    address public chairPerson;
    ERC20 public voteToken;
    uint256 public minimumQuorum;
    uint256 public debatingPeriodDuration;
    mapping(uint256 => bool) public proposals;
    mapping(address => uint256) public votingPower;

    /**
        @dev Events
     */

    event Vote();
    event Deposit();
    event CreateProposal();
    event FinishProposal();
    event Withdraw();

    constructor(
        address _chairPerson,
        ERC20 _voteToken,
        uint256 _minimumQuorum,
        uint256 _debatingPeriodDuration
    ) ERC20("DAOToken", "DAT") {
        minimumQuorum = _minimumQuorum;
        debatingPeriodDuration = _debatingPeriodDuration;
        chairPerson = _chairPerson;
        voteToken = _voteToken;
    }

    modifier onlyChairPerson(address sender) {
        if (sender != chairPerson) revert NotChairPerson();
        _;
    }

    /// @dev Set minimum quorum
    /// @param _minimumQuorum for finish proposal
    function setMinimumQuorum(uint256 _minimumQuorum)
        external
        onlyChairPerson(msg.sender)
    {
        minimumQuorum = _minimumQuorum;
    }

    /// @dev Set debating period duration
    /// @param _debatingPeriodDuration duration of period debating
    function setdebatingPeriod(uint256 _debatingPeriodDuration)
        external
        onlyChairPerson(msg.sender)
    {
        debatingPeriodDuration = _debatingPeriodDuration;
    }

    /// @dev Mint tokens
    /// @param to address for mint
    /// @param amount of tokens
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

    /// @dev Vote by tokens
    /// @param proposalId id of proposal
    function vote(uint256 proposalId) external {
        emit Vote();
    }

    /// @dev Add proposal for voting
    /// @param callData remembers current voting conditions
    /// @param _recipient address for funds transfer
    /// @param description of current proposal
    function addProposal(
        bytes memory callData,
        address _recipient,
        string memory description
    ) external {
        emit CreateProposal();
    }

    /// @dev Contributing tokens to vote
    /// @param amount of tokens
    function deposit(uint256 amount) external {
        emit Deposit();
    }

    /// @dev Withdraw tokens
    function withdraw() external {
        emit Withdraw();
    }

    /// @dev Finish current proposal
    /// @param proposalId id of proposal
    function finish(uint256 proposalId) external {
        emit FinishProposal();
    }
}
