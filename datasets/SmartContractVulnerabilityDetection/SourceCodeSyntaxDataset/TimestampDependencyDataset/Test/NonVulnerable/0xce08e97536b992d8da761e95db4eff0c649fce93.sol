pragma solidity ^0.4.19;
contract KnowItAll {
 address owner;
 function KnowItAll()
 public {
 owner = msg.sender;
 address precalculatedAddress = 0xce08e97536b992d8da761e95db4eff0c649fce93;
 }
 function calculateAddress(uint8 _nonce)
 public
 constant
 returns (address) {
 require(msg.sender == owner);
 return address(keccak256(0xd6, 0x94, 0x6B1e0fb8c127B29747a186AEC66973A8CE2458ee, _nonce));
 }
}