pragma solidity ^0.4.12;
library SafeMath {
 function mul(uint256 a, uint256 b) internal constant returns (uint256) {
 uint256 c = a * b;
 assert(a == 0 || c / a == b);
 return c;
 }
 function div(uint256 a, uint256 b) internal constant returns (uint256) {
 uint256 c = a / b;
 return c;
 }
 function sub(uint256 a, uint256 b) internal constant returns (uint256) {
 assert(b <= a);
 return a - b;
 }
 function add(uint256 a, uint256 b) internal constant returns (uint256) {
 uint256 c = a + b;
 assert(c >= a);
 return c;
 }
}
contract ERC20Basic {
 uint256 public totalSupply;
 function balanceOf(address who) constant returns (uint256);
 function transfer(address to, uint256 value) returns (bool);
 event Transfer(address indexed from, address indexed to, uint256 value);
}
contract ERC20 is ERC20Basic {
 function allowance(address owner, address spender) constant returns (uint256);
 function transferFrom(address from, address to, uint256 value) returns (bool);
 function approve(address spender, uint256 value) returns (bool);
 event Approval(address indexed owner, address indexed spender, uint256 value);
}
library SafeERC20 {
 function safeTransfer(ERC20Basic token, address to, uint256 value) internal {
 assert(token.transfer(to, value));
 }
 function safeTransferFrom(ERC20 token, address from, address to, uint256 value) internal {
 assert(token.transferFrom(from, to, value));
 }
 function safeApprove(ERC20 token, address spender, uint256 value) internal {
 assert(token.approve(spender, value));
 }
}
contract Ownable {
 address public owner;
 event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
 function Ownable() {
 owner = msg.sender;
 }
 modifier onlyOwner() {
 require(msg.sender == owner);
 _;
 }
 function transferOwnership(address newOwner) onlyOwner {
 require(newOwner != address(0));
 OwnershipTransferred(owner, newOwner);
 owner = newOwner;
 }
}
contract HasNoContracts is Ownable {
 function reclaimContract(address contractAddr) external onlyOwner {
 Ownable contractInst = Ownable(contractAddr);
 contractInst.transferOwnership(owner);
 }
}
contract CanReclaimToken is Ownable {
 using SafeERC20 for ERC20Basic;
 function reclaimToken(ERC20Basic token) external onlyOwner {
 uint256 balance = token.balanceOf(this);
 token.safeTransfer(owner, balance);
 }
}
contract HasNoTokens is CanReclaimToken {
 function tokenFallback(address , uint256 , bytes ) external {
 revert();
 }
}
contract BasicToken is ERC20Basic {
 using SafeMath for uint256;
 mapping(address => uint256) balances;
 function transfer(address _to, uint256 _value) returns (bool) {
 require(_to != address(0));
 balances[msg.sender] = balances[msg.sender].sub(_value);
 balances[_to] = balances[_to].add(_value);
 Transfer(msg.sender, _to, _value);
 return true;
 }
 function balanceOf(address _owner) constant returns (uint256 balance) {
 return balances[_owner];
 }
}
contract StandardToken is ERC20, BasicToken {
 mapping (address => mapping (address => uint256)) allowed;
 function transferFrom(address _from, address _to, uint256 _value) returns (bool) {
 require(_to != address(0));
 var _allowance = allowed[_from][msg.sender];
 balances[_from] = balances[_from].sub(_value);
 balances[_to] = balances[_to].add(_value);
 allowed[_from][msg.sender] = _allowance.sub(_value);
 Transfer(_from, _to, _value);
 return true;
 }
 function approve(address _spender, uint256 _value) returns (bool) {
 require((_value == 0) || (allowed[msg.sender][_spender] == 0));
 allowed[msg.sender][_spender] = _value;
 Approval(msg.sender, _spender, _value);
 return true;
 }
 function allowance(address _owner, address _spender) constant returns (uint256 remaining) {
 return allowed[_owner][_spender];
 }
 function increaseApproval (address _spender, uint _addedValue)
 returns (bool success) {
 allowed[msg.sender][_spender] = allowed[msg.sender][_spender].add(_addedValue);
 Approval(msg.sender, _spender, allowed[msg.sender][_spender]);
 return true;
 }
 function decreaseApproval (address _spender, uint _subtractedValue)
 returns (bool success) {
 uint oldValue = allowed[msg.sender][_spender];
 if (_subtractedValue > oldValue) {
 allowed[msg.sender][_spender] = 0;
 } else {
 allowed[msg.sender][_spender] = oldValue.sub(_subtractedValue);
 }
 Approval(msg.sender, _spender, allowed[msg.sender][_spender]);
 return true;
 }
}
contract MintableToken is StandardToken, Ownable {
 event Mint(address indexed to, uint256 amount);
 event MintFinished();
 bool public mintingFinished = false;
 modifier canMint() {
 require(!mintingFinished);
 _;
 }
 function mint(address _to, uint256 _amount) onlyOwner canMint returns (bool) {
 totalSupply = totalSupply.add(_amount);
 balances[_to] = balances[_to].add(_amount);
 Mint(_to, _amount);
 Transfer(0x0, _to, _amount);
 return true;
 }
 function finishMinting() onlyOwner returns (bool) {
 mintingFinished = true;
 MintFinished();
 return true;
 }
}
contract BurnableToken is StandardToken {
 using SafeMath for uint256;
 event Burn(address indexed from, uint256 amount);
 event BurnRewardIncreased(address indexed from, uint256 value);
 function() payable {
 if(msg.value > 0){
 BurnRewardIncreased(msg.sender, msg.value);
 }
 }
 function burnReward(uint256 _amount) public constant returns(uint256){
 return this.balance.mul(_amount).div(totalSupply);
 }
 function burn(address _from, uint256 _amount) internal returns(bool){
 require(balances[_from] >= _amount);
 uint256 reward = burnReward(_amount);
 assert(this.balance - reward > 0);
 balances[_from] = balances[_from].sub(_amount);
 totalSupply = totalSupply.sub(_amount);
 _from.transfer(reward);
 Transfer(_from, 0x0, _amount);
 Burn(_from, _amount);
 return true;
 }
 function transfer(address _to, uint256 _value) returns (bool) {
 if( (_to == address(this)) || (_to == 0) ){
 return burn(msg.sender, _value);
 }else{
 return super.transfer(_to, _value);
 }
 }
 function transferFrom(address _from, address _to, uint256 _value) returns (bool) {
 if( (_to == address(this)) || (_to == 0) ){
 var _allowance = allowed[_from][msg.sender];
 allowed[_from][msg.sender] = _allowance.sub(_value);
 return burn(_from, _value);
 }else{
 return super.transferFrom(_from, _to, _value);
 }
 }
}
contract MatreXaToken is BurnableToken, MintableToken, HasNoContracts, HasNoTokens {
 using SafeMath for uint256;
 string public name = "MatreXa";
 string public symbol = "MTRX";
 uint256 public decimals = 18;
 address public founder;
 uint256 public allowTransferTimestamp = 0;
 modifier canTransfer() {
 if(msg.sender != founder) {
 require(mintingFinished);
 require(now > allowTransferTimestamp);
 }
 _;
 }
 function setFounder(address _founder) onlyOwner {
 founder = _founder;
 }
 function setAllowTransferTimestamp(uint256 _allowTransferTimestamp) onlyOwner {
 require(allowTransferTimestamp == 0);
 allowTransferTimestamp = _allowTransferTimestamp;
 }
 function transfer(address _to, uint256 _value) canTransfer returns (bool) {
 BurnableToken.transfer(_to, _value);
 }
 function transferFrom(address _from, address _to, uint256 _value) canTransfer returns (bool) {
 BurnableToken.transferFrom(_from, _to, _value);
 }
}