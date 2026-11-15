/*
SPDX-License-Identifier: Apache-2.0
*/

package main

import (
	"log"

	"github.com/citi-npci/escrow/chaincode/chaincode"
	"github.com/hyperledger/fabric-contract-api-go/v2/contractapi"
)

func main() {
	escrowChaincode, err := contractapi.NewChaincode(&chaincode.SmartContract{})
	if err != nil {
		log.Panicf("Error creating escrow chaincode: %v", err)
	}

	if err := escrowChaincode.Start(); err != nil {
		log.Panicf("Error starting escrow chaincode: %v", err)
	}
}
