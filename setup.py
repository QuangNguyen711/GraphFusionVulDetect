import pickle
import subprocess
import os

# The list of versions is in the same pickle file
VERSIONS_FILE = 'datasets/SmartContractVulnerabilityDetection/sc_versions.pkl'

def download_all_solc_versions():
    """
    This script should be run directly from your standard terminal (e.g., PowerShell),
    NOT using 'uv run'. It uses the working 'solc-select' from your base environment
    to download all necessary compiler versions into ~/.solc-select/artifacts.
    """
    print("--- Starting SOLC Compiler Setup ---")
    
    if not os.path.exists(VERSIONS_FILE):
        print(f"Error: Versions file not found at '{VERSIONS_FILE}'")
        return

    with open(VERSIONS_FILE, 'rb') as f:
        sc_versions = pickle.load(f)

    print(f"Found {len(sc_versions)} versions to install.")
    
    for version in sc_versions:
        print(f"\nAttempting to install: {version}")
        try:
            # We run the command directly. If it fails, it will print an error.
            # We don't use check=True so the script can continue if one version fails.
            subprocess.run(['solc-select', 'install', version])
        except Exception as e:
            print(f"An error occurred while trying to run solc-select for version {version}: {e}")

    print("\n--- Setup complete. All available solc versions should now be downloaded. ---")

if __name__ == "__main__":
    download_all_solc_versions()