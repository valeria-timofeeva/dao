//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
    @dev Errors
 */

error NotChairperson();
error IncorrectQuorum();
error VotingProcess();
error ProposalNotExist();
error AlreadyVoted();
error VotingFinished();
error AlreadyFinished();

/**
    @title smart contract for DAO governance
    @author Valeria Timofeeva
 */

contract DAO is ERC20 {
    address public chairperson;
    uint256 public nextId;
    uint256 public minimumQuorum;
    uint256 public debatingPeriodDuration;
    mapping(uint256 => Proposal) public proposals;
    mapping(address => Stake) public votingPower;

    /**
        @dev Events
     */

    event Voted(uint256 id, address indexed voter, bool indexed answer);
    event Staked(address indexed from, uint256 amount);
    event ProposalCreated(
        uint256 indexed id,
        address indexed recipient,
        string description,
        uint256 finishTime,
        uint256 minimumQuorum
    );
    event ProposalFinished(uint256 indexed id, bool indexed result);
    event Withdrawn(address indexed to, uint256 amount);

    /// @dev Information about stake
    struct Stake {
        uint256 amount;
        uint256 lockedTime;
    }

    /// @dev Information about proposal
    struct Proposal {
        mapping(address => bool) voters;
        uint256 agreement;
        uint256 disagreement;
        uint256 endTime;
        uint256 minimumQuorum;
        bool isFinished;
        address recipient;
        bytes instruction;
        string description;
    }

    constructor(
        uint256 _minimumQuorum,
        uint256 _debatingPeriodDuration,
        uint256 _daoTokens
    ) ERC20("DAOToken", "DAT") {
        minimumQuorum = calculateQuorum(_minimumQuorum, _daoTokens);
        debatingPeriodDuration = _debatingPeriodDuration;
        chairperson = msg.sender;
        _mint(msg.sender, _daoTokens);
    }

    modifier onlyChairperson(address sender) {
        if (sender != chairperson) revert NotChairperson();
        _;
    }

    /// @dev Set minimum quorum
    /// @param percent of votes for finish proposal
    function setMinimumQuorum(uint256 percent)
        external
        onlyChairperson(msg.sender)
    {
        minimumQuorum = calculateQuorum(percent, totalSupply());
    }

    /// @dev Calculate quorum
    /// @param percent of result
    /// @param tokens amount
    function calculateQuorum(uint256 percent, uint256 tokens)
        private
        pure
        returns (uint256 quorum)
    {
        if (percent == 0) {
            quorum = 0;
        }
        if (percent > 100) revert IncorrectQuorum();

        quorum = (tokens * percent) / 100;
    }

    /// @dev Set debating period duration
    /// @param _debatingPeriodDuration duration of period debating
    function setDebatingPeriod(uint256 _debatingPeriodDuration)
        external
        onlyChairperson(msg.sender)
    {
        debatingPeriodDuration = _debatingPeriodDuration;
    }

    /**
        @dev Staking
     */

    /// @dev Contributing tokens to vote
    /// @param amount of tokens
    function stake(uint256 amount) external {
        _transfer(msg.sender, address(this), amount);
        Stake memory _stake = votingPower[msg.sender];
        _stake.amount += amount;
        votingPower[msg.sender] = _stake;
        emit Staked(msg.sender, amount);
    }

    /// @dev Withdraw tokens
    function withdraw() external {
        Stake memory _stake = votingPower[msg.sender];
        if (_stake.lockedTime > block.timestamp) revert VotingProcess();

        _transfer(address(this), msg.sender, _stake.amount);
        emit Withdrawn(msg.sender, _stake.amount);

        _stake.amount = 0;
        votingPower[msg.sender] = _stake;
    }

    /// @dev Vote by tokens
    /// @param proposalId id of proposal
    /// @param _vote is proposal decision
    function vote(uint256 proposalId, bool _vote) external {
        if (proposalId >= nextId) revert ProposalNotExist();
        Proposal storage proposal = proposals[proposalId];
        uint256 _endTime = proposal.endTime;

        if (proposal.voters[msg.sender]) revert AlreadyVoted();
        if (_endTime < block.timestamp) revert VotingFinished();

        Stake memory _stake = votingPower[msg.sender];
        if (_vote) {
            proposal.agreement += _stake.amount;
        } else {
            proposal.disagreement += _stake.amount;
        }

        ///extend the locked period if proposal not the only one
        if (_endTime > _stake.lockedTime)
            votingPower[msg.sender].lockedTime = _endTime;

        proposal.voters[msg.sender] = true;
        emit Voted(proposalId, msg.sender, _vote);
    }

    /**
        @dev Proposals
     */

    /// @dev Add proposal for voting
    /// @param _instruction remembers current voting conditions
    /// @param _recipient address for funds transfer
    /// @param _description of current proposal
    function addProposal(
        bytes calldata _instruction,
        address _recipient,
        string memory _description
    ) external onlyChairperson(msg.sender) {
        Proposal storage proposal = proposals[nextId];
        proposal.minimumQuorum = minimumQuorum;
        proposal.endTime = block.timestamp + debatingPeriodDuration;
        proposal.instruction = _instruction;
        proposal.description = _description;
        proposal.recipient = _recipient;
        emit ProposalCreated(
            nextId,
            _recipient,
            _description,
            debatingPeriodDuration,
            minimumQuorum
        );
        nextId++;
    }

    /// @dev Finish current proposal
    /// @param proposalId id of proposal
    function finishProposal(uint256 proposalId) external {
        if (proposalId >= nextId) revert ProposalNotExist();

        Proposal storage proposal = proposals[proposalId];
        if (block.timestamp < proposal.endTime) revert VotingProcess();
        if (proposal.isFinished) revert AlreadyFinished();

        if (proposal.agreement + proposal.disagreement < proposal.minimumQuorum)
            emit ProposalFinished(proposalId, false);

        if (proposal.disagreement >= proposal.agreement) {
            emit ProposalFinished(proposalId, false);
        } else {
            (bool success, ) = proposal.recipient.call(proposal.instruction);
            emit ProposalFinished(proposalId, success);
        }
        proposal.isFinished = true;
    }
}
