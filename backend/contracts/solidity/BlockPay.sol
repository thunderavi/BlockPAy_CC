// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract BlockPay {
    struct PaymentProof {
        string senderUsername;
        string receiverUsername;
        uint256 amount;
        uint256 timestamp;
        string paymentId;
        string applicationHash;
    }

    PaymentProof[] private transactions;
    mapping(string => uint256) private transactionIndexByPaymentId;

    event TransactionCreated(
        string indexed paymentId,
        string senderUsername,
        string receiverUsername,
        uint256 amount,
        string applicationHash
    );

    function createTransaction(
        string calldata senderUsername,
        string calldata receiverUsername,
        uint256 amount,
        string calldata paymentId,
        string calldata applicationHash
    ) external {
        require(bytes(paymentId).length > 0, "Payment ID required");
        require(transactionIndexByPaymentId[paymentId] == 0, "Payment already exists");

        transactions.push(
            PaymentProof({
                senderUsername: senderUsername,
                receiverUsername: receiverUsername,
                amount: amount,
                timestamp: block.timestamp,
                paymentId: paymentId,
                applicationHash: applicationHash
            })
        );

        transactionIndexByPaymentId[paymentId] = transactions.length;

        emit TransactionCreated(
            paymentId,
            senderUsername,
            receiverUsername,
            amount,
            applicationHash
        );
    }

    function verifyTransaction(string calldata paymentId, string calldata applicationHash) external view returns (bool) {
        uint256 index = transactionIndexByPaymentId[paymentId];
        if (index == 0) {
            return false;
        }

        PaymentProof memory proof = transactions[index - 1];
        return keccak256(bytes(proof.applicationHash)) == keccak256(bytes(applicationHash));
    }

    function getTransaction(string calldata paymentId) external view returns (PaymentProof memory) {
        uint256 index = transactionIndexByPaymentId[paymentId];
        require(index > 0, "Transaction not found");
        return transactions[index - 1];
    }

    function getAllTransactions() external view returns (PaymentProof[] memory) {
        return transactions;
    }
}
