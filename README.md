# CrowdFunding

## Overview
This project implements a simple crowdfunding system on the Azle platform, allowing users to create, contribute to, and manage crowdfunding projects. The system is built using the Azle library, providing a secure and decentralized environment for crowdfunding operations.

## Prerequisites
- Node
- Typescript
- DFX

## Installation

1. **Clone the repository:**
    ```bash
    git clone https://github.com/maikeljh/crowdfunding-smart-contract-icp.git
    cd crowdfunding
    nvm install 18
    nvm use 18
    npm install
    ```
2. **INSTALL DFX**
    ```bash
    DFX_VERSION=0.14.1 sh -ci "$(curl -fsSL https://sdk.dfinity.org/install.sh)"
    ```
3. **Add DFX to your path**
    ```bash
    echo 'export PATH="$PATH:$HOME/bin"' >> "$HOME/.bashrc"
    ```

## Usage

Here are the main functionalities provided by this system:

### Managing Products

- `createProject`
  - Creates a new crowdfunding project.
- `contributeToProject`
  - Allows a contributor to contribute to an existing crowdfunding project.
- `getProjects`
  - Retrieves a list of crowdfunding projects based on their status if provided.
- `getProject`
  - Retrieves the details of a specific crowdfunding project based on its ID.
- `getContributors`
  - Retrieves the list of contributors for a specific crowdfunding project.
- `updateStatus`
  - Updates the status of a crowdfunding project based on the provided status.
- `updateProject`
  - Updates the details of an existing crowdfunding project.
- `cancelProject`
  - Cancels a crowdfunding project, setting its status to "Expired".

## Testing Instructions 

- Make sure you have the required environment for running ICP canisters and the dfx is running in background `dfx start --background --clean`
- Deploy the canisters `dfx deploy`
- Open the URL for Backend canister via Candid interface

To conclude your work session, you can stop your local Azle replica by executing the following command in your terminal:
  ```bash
   dfx stop
  ```

## Author
Michael Jonathan Halim
