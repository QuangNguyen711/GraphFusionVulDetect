#!/usr/bin/env python3
"""
Simple test script for the GraphFusionVulDetect API
"""

import asyncio
import aiohttp
import json
import os
from pathlib import Path

async def test_api_health():
    """Test API health endpoint"""
    print("Testing API health...")
    
    async with aiohttp.ClientSession() as session:
        async with session.get("http://localhost:8000/health") as response:
            if response.status == 200:
                data = await response.json()
                print(f"✅ Health check passed: {data}")
                return True
            else:
                print(f"❌ Health check failed: {response.status}")
                return False

async def test_analysis_service_health():
    """Test analysis service health endpoint"""
    print("Testing analysis service health...")
    
    async with aiohttp.ClientSession() as session:
        async with session.get("http://localhost:8000/api/v1/health") as response:
            if response.status == 200:
                data = await response.json()
                print(f"✅ Analysis service health check passed: {data}")
                return True
            else:
                print(f"❌ Analysis service health check failed: {response.status}")
                return False

async def test_analyze_endpoint():
    """Test the analyze endpoint with a sample file"""
    print("Testing analyze endpoint...")
    
    # Create a simple test Solidity contract
    test_contract = '''
pragma solidity ^0.8.0;

contract TestContract {
    mapping(address => uint256) public balances;
    
    function transfer(address to, uint256 amount) public {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        balances[to] += amount;
    }
    
    function deposit() public payable {
        balances[msg.sender] += msg.value;
    }
}
'''
    
    # Save test contract to a temporary file
    test_file = "test_contract.sol"
    with open(test_file, "w") as f:
        f.write(test_contract)
    
    try:
        async with aiohttp.ClientSession() as session:
            # Prepare the file upload
            with open(test_file, "rb") as f:
                data = aiohttp.FormData()
                data.add_field('file', f, filename='test_contract.sol', content_type='text/plain')
                
                print("Uploading test contract for analysis...")
                async with session.post("http://localhost:8000/api/v1/analyze", data=data) as response:
                    if response.status == 200:
                        print("✅ Analysis started successfully!")
                        print("Streaming results:")
                        print("-" * 50)
                        
                        # Read streaming response
                        async for line in response.content:
                            if line:
                                try:
                                    result = json.loads(line.decode().strip())
                                    print(f"Node: {result.get('node', 'unknown')}")
                                    print(f"Output: {json.dumps(result.get('output', {}), indent=2)}")
                                    print("-" * 30)
                                except json.JSONDecodeError:
                                    print(f"Raw line: {line.decode()}")
                        
                        return True
                    else:
                        error_text = await response.text()
                        print(f"❌ Analysis failed: {response.status}")
                        print(f"Error: {error_text}")
                        return False
    finally:
        # Clean up test file
        if os.path.exists(test_file):
            os.remove(test_file)

async def main():
    """Main test function"""
    print("GraphFusionVulDetect API Test")
    print("=" * 40)
    
    # Test basic health
    health_ok = await test_api_health()
    if not health_ok:
        print("❌ Basic health check failed. Make sure the API is running.")
        return
    
    print()
    
    # Test analysis service health
    service_health_ok = await test_analysis_service_health()
    if not service_health_ok:
        print("❌ Analysis service health check failed.")
        return
    
    print()
    
    # Test analysis endpoint
    analysis_ok = await test_analyze_endpoint()
    if analysis_ok:
        print("\n✅ All tests passed!")
    else:
        print("\n❌ Analysis test failed.")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nTest interrupted by user.")
    except Exception as e:
        print(f"\nTest failed with error: {e}")
