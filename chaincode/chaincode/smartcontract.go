package chaincode

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/v2/contractapi"
)

// SmartContract provides programmable escrow functions for Citi × NPCI settlement.
type SmartContract struct {
	contractapi.Contract
}

// EscrowTx is the on-chain escrow state model.
// Fields are alphabetically ordered for deterministic JSON marshalling.
type EscrowTx struct {
	Amount      float64 `json:"Amount"`
	Condition   string  `json:"Condition"`
	CreatedAt   string  `json:"CreatedAt"`
	EscrowID    string  `json:"EscrowID"`
	ReceiverOrg string  `json:"ReceiverOrg"`
	SenderOrg   string  `json:"SenderOrg"`
	Status      string  `json:"Status"`
	UpdatedAt   string  `json:"UpdatedAt"`
}

// HistoryRecord captures an immutable ledger history entry for an escrow.
type HistoryRecord struct {
	IsDelete  bool     `json:"IsDelete"`
	Timestamp string   `json:"Timestamp"`
	TxID      string   `json:"TxID"`
	Value     EscrowTx `json:"Value"`
}

const (
	statusLocked   = "LOCKED"
	statusSettled  = "SETTLED"
	statusRefunded = "REFUNDED"
)

// InitLedger seeds two realistic sample escrows.
func (s *SmartContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	escrows := []EscrowTx{
		{
			EscrowID:    "ESC-1001",
			SenderOrg:   "CitiBank",
			ReceiverOrg: "MerchantCorp",
			Amount:      2500000.00,
			Condition:   "DELIVERY_VERIFIED",
			Status:      statusLocked,
			CreatedAt:   "2026-03-10T09:15:00Z",
			UpdatedAt:   "2026-03-10T09:15:00Z",
		},
		{
			EscrowID:    "ESC-1002",
			SenderOrg:   "CitiBank",
			ReceiverOrg: "RetailIndia Ltd",
			Amount:      875000.50,
			Condition:   "INVOICE_APPROVED",
			Status:      statusSettled,
			CreatedAt:   "2026-03-08T14:30:00Z",
			UpdatedAt:   "2026-03-09T11:05:00Z",
		},
	}

	for _, escrow := range escrows {
		escrowJSON, err := json.Marshal(escrow)
		if err != nil {
			return err
		}
		if err := ctx.GetStub().PutState(escrow.EscrowID, escrowJSON); err != nil {
			return fmt.Errorf("failed to put escrow %s: %v", escrow.EscrowID, err)
		}
	}

	return nil
}

// CreateEscrow locks funds into a new escrow record.
func (s *SmartContract) CreateEscrow(ctx contractapi.TransactionContextInterface, escrowID string, senderOrg string, receiverOrg string, amount float64, condition string, timestamp string) error {
	if escrowID == "" {
		return fmt.Errorf("escrowID is required")
	}
	if senderOrg == "" || receiverOrg == "" {
		return fmt.Errorf("senderOrg and receiverOrg are required")
	}
	if condition == "" {
		return fmt.Errorf("condition is required")
	}
	if timestamp == "" {
		return fmt.Errorf("timestamp is required")
	}
	if amount <= 0 {
		return fmt.Errorf("amount must be positive")
	}

	exists, err := s.escrowExists(ctx, escrowID)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("the escrow %s already exists", escrowID)
	}

	escrow := EscrowTx{
		EscrowID:    escrowID,
		SenderOrg:   senderOrg,
		ReceiverOrg: receiverOrg,
		Amount:      amount,
		Condition:   condition,
		Status:      statusLocked,
		CreatedAt:   timestamp,
		UpdatedAt:   timestamp,
	}

	escrowJSON, err := json.Marshal(escrow)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(escrowID, escrowJSON)
}

// SettleEscrow releases locked funds to the receiver.
func (s *SmartContract) SettleEscrow(ctx contractapi.TransactionContextInterface, escrowID string, timestamp string) error {
	escrow, err := s.readEscrow(ctx, escrowID)
	if err != nil {
		return err
	}
	if timestamp == "" {
		return fmt.Errorf("timestamp is required")
	}
	if escrow.Status != statusLocked {
		return fmt.Errorf("escrow %s cannot be settled from status %s", escrowID, escrow.Status)
	}

	escrow.Status = statusSettled
	escrow.UpdatedAt = timestamp

	escrowJSON, err := json.Marshal(escrow)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(escrowID, escrowJSON)
}

// RefundEscrow returns locked funds to the sender.
func (s *SmartContract) RefundEscrow(ctx contractapi.TransactionContextInterface, escrowID string, timestamp string) error {
	escrow, err := s.readEscrow(ctx, escrowID)
	if err != nil {
		return err
	}
	if timestamp == "" {
		return fmt.Errorf("timestamp is required")
	}
	if escrow.Status != statusLocked {
		return fmt.Errorf("escrow %s cannot be refunded from status %s", escrowID, escrow.Status)
	}

	escrow.Status = statusRefunded
	escrow.UpdatedAt = timestamp

	escrowJSON, err := json.Marshal(escrow)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(escrowID, escrowJSON)
}

// GetAllEscrows returns every escrow currently on the ledger.
func (s *SmartContract) GetAllEscrows(ctx contractapi.TransactionContextInterface) ([]*EscrowTx, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var escrows []*EscrowTx
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var escrow EscrowTx
		if err := json.Unmarshal(queryResponse.Value, &escrow); err != nil {
			return nil, err
		}
		escrows = append(escrows, &escrow)
	}

	return escrows, nil
}

// GetEscrowHistory returns the immutable audit trail for an escrow key.
func (s *SmartContract) GetEscrowHistory(ctx contractapi.TransactionContextInterface, escrowID string) ([]*HistoryRecord, error) {
	exists, err := s.escrowExists(ctx, escrowID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, fmt.Errorf("the escrow %s does not exist", escrowID)
	}

	historyIterator, err := ctx.GetStub().GetHistoryForKey(escrowID)
	if err != nil {
		return nil, fmt.Errorf("failed to get history for escrow %s: %v", escrowID, err)
	}
	defer historyIterator.Close()

	var history []*HistoryRecord
	for historyIterator.HasNext() {
		response, err := historyIterator.Next()
		if err != nil {
			return nil, err
		}

		record := &HistoryRecord{
			TxID:     response.TxId,
			IsDelete: response.IsDelete,
		}
		if response.Timestamp != nil {
			record.Timestamp = response.Timestamp.AsTime().UTC().Format("2006-01-02T15:04:05Z")
		}

		if len(response.Value) > 0 {
			var escrow EscrowTx
			if err := json.Unmarshal(response.Value, &escrow); err != nil {
				return nil, err
			}
			record.Value = escrow
		}

		history = append(history, record)
	}

	return history, nil
}

func (s *SmartContract) readEscrow(ctx contractapi.TransactionContextInterface, escrowID string) (*EscrowTx, error) {
	escrowJSON, err := ctx.GetStub().GetState(escrowID)
	if err != nil {
		return nil, fmt.Errorf("failed to read escrow %s: %v", escrowID, err)
	}
	if escrowJSON == nil {
		return nil, fmt.Errorf("the escrow %s does not exist", escrowID)
	}

	var escrow EscrowTx
	if err := json.Unmarshal(escrowJSON, &escrow); err != nil {
		return nil, err
	}
	return &escrow, nil
}

func (s *SmartContract) escrowExists(ctx contractapi.TransactionContextInterface, escrowID string) (bool, error) {
	escrowJSON, err := ctx.GetStub().GetState(escrowID)
	if err != nil {
		return false, fmt.Errorf("failed to read escrow %s: %v", escrowID, err)
	}
	return escrowJSON != nil, nil
}
