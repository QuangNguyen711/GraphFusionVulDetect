pragma solidity ^0.4.13;
contract ChooseWHGReturnAddress {
 mapping (address => address) returnAddresses;
 uint public endDate;
 function ChooseWHGReturnAddress(uint _endDate) {
 endDate = _endDate;
 }
 function requestReturn(address _returnAddr) {
 require(now <= endDate);
 require(returnAddresses[msg.sender] == 0x0);
 returnAddresses[msg.sender] = _returnAddr;
 ReturnRequested(msg.sender, _returnAddr);
 }
 function getReturnAddress(address _addr) constant returns (address) {
 if (returnAddresses[_addr] == 0x0) {
 return _addr;
 } else {
 return returnAddresses[_addr];
 }
 }
 function isReturnRequested(address _addr) constant returns (bool) {
 return returnAddresses[_addr] != 0x0;
 }
 event ReturnRequested(address indexed origin, address indexed returnAddress);
}