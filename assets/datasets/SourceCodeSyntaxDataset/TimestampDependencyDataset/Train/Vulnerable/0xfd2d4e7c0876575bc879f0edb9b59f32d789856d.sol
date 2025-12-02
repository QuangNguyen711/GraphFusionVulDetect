pragma solidity ^0.4.19;
contract Ownable {
 address public owner;
 event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
 function Ownable() public {
 owner = msg.sender;
 }
 modifier onlyOwner() {
 require(msg.sender == owner);
 _;
 }
 function transferOwnership(address newOwner) public onlyOwner {
 require(newOwner != address(0));
 OwnershipTransferred(owner, newOwner);
 owner = newOwner;
 }
}
library SafeMath {
 function mul(uint256 a, uint256 b) internal pure returns (uint256) {
 if (a == 0) {
 return 0;
 }
 uint256 c = a * b;
 assert(c / a == b);
 return c;
 }
 function div(uint256 a, uint256 b) internal pure returns (uint256) {
 uint256 c = a / b;
 return c;
 }
 function sub(uint256 a, uint256 b) internal pure returns (uint256) {
 assert(b <= a);
 return a - b;
 }
 function add(uint256 a, uint256 b) internal pure returns (uint256) {
 uint256 c = a + b;
 assert(c >= a);
 return c;
 }
}
contract ChristmasClub is Ownable {
 using SafeMath for uint256;
 uint public withdrawalTime = 1543622400;
 uint public earlyWithdrawalFeePct = 5;
 mapping (address => uint) balances;
 function deposit () public payable {
 balances[msg.sender] = balances[msg.sender].add(msg.value);
 }
 function withdraw () public {
 uint toWithdraw = balances[msg.sender];
 if (now < withdrawalTime) {
 toWithdraw = toWithdraw.mul(100 - earlyWithdrawalFeePct).div(100);
 balances[owner] = balances[owner].add(balances[msg.sender] - toWithdraw);
 }
 balances[msg.sender] = 0;
 msg.sender.transfer(toWithdraw);
 }
 function getBalance () public view returns (uint) {
 return balances[msg.sender];
 }
 function () public payable {
 }
}