# Script for Batch Creating Beneficiaries

## 1. Running the File

1. Download/Pull the code from this repository
2. Open the integrated terminal within Visual Studio Code, and navigate to root of this nodejs app.
3. Run `npm install` to install all the node dependencies.
4. Run `nodemon server.js` to run the local server.

## 2. Endpoints in this Script
This script (`server.js` file) has two end points. 
1. `/create-bene`(line 60) - this end-point runs a loop and creates the beneficiaries one after the other.
2. `/validate-bene` (line 126) - this end-point runs a loop to call the Validate Beneficiary API one after the other.

```diff
- **Important Note:**
  Call the `/validate-bene` endpoint first before calling the `/create-bene` endpoint.
```

## 3. How to call an endpoint

```
http://localhost:4242/validate-bene
http://localhost:4242/create-bene
```

## 4. What does `/validate-bene` endpoint do?

1. **Please call the validate function with Demo token. Meaning replace the `auth_token` in line 10 with the auth token your DEMO account**
2. It reads the beneficiary data from the csv file, the path for which is specified in line 131. If you were to add a new file to the app folder, add it in the root folder and replace create_payments1 with the appropriate file name. 
3. It runs the `validate_bene()` function in a loop - as defined in line 209. Function `validate_bene()` is defined in line 147.
4. After this, we update the `validation_results.json` file with results of the validate_bene function.
5. Then we update the `validation_errors.csv` file with errors of the validation function. IF there are errors identified in the validation operation, `validation_errors.csv` file will capture it. Please share the same with the customer so that he can fix it.

## 5. What `/create-bene` endpoint do?

1. **Before calling the `/create-bene` endpoint, please replace the `auth_token` in line 10 with Production token from client. Use, POSTMAN for this by getting the APIKey and ClientID from the client.**
2. `/create-bene` endpoint utilises the array `validation_results.successful.results` to iterate through. It does not read from the create_payments.csv file for simplicity.
3. create_bene() function is called in a loop in line 111. Function defined in line 67. 
4. After this the endpoint appends the result of Step 3 to `beneficiary_create_result.json` file. Which can be shared with customer as well.
