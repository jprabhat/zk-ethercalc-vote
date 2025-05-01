// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Vote {
    mapping(address => uint256) public votes;
    mapping(address => bool) public hasVoted;

    event Voted(address voter, uint256 weight);

    function vote(uint256 weight) external {
        require(!hasVoted[msg.sender], "Already voted");
        votes[msg.sender] = weight;
        hasVoted[msg.sender] = true;
        emit Voted(msg.sender, weight);
    }

    function getVote(address user) external view returns (uint256) {
        return votes[user];
    }
}
