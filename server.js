const express = require("express");
const app = express();
const path = require("path");
const fs = require("fs");
const csv = require("csv-parser");

const axios = require("axios");

const auth_token =
  "eyJhbGciOiJIUzI1NiJ9.eyJ0eXBlIjoiY2xpZW50IiwiZGMiOiJISyIsImRhdGFfY2VudGVyX3JlZ2lvbiI6IkhLIiwiaXNzZGMiOiJVUyIsImp0aSI6IjE5NTE2ZjM2LWYxYTAtNDIyNi1iYTY2LWE3NjkxMjc0NWFiNCIsInN1YiI6ImE3NDZiYzI0LWJkNmEtNDAzMC1hYzZhLWIxODhhMzgwYjk5MyIsImlhdCI6MTY5MDU1NjkyNiwiZXhwIjoxNjkwNTU4NzI2LCJhY2NvdW50X2lkIjoiZGY0OTY1NDQtN2NmZi00YzU1LWI3YzgtMTIwNzhhODQwNjQ1IiwicGVybWlzc2lvbnMiOlsicjphd3g6KjoqIiwidzphd3g6KjoqIl19.xjRQui6WHCgFdW41D-4hTotHWpUc1NAqmkFsennIw98";

app.use(express.static("public"));
app.use(express.json());

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, x-client-key, x-client-token, x-client-secret, Authorization"
  );
  next();
});

const error_codes = require("./error_codes.json");
const val_results = require("./validation_results.json");

const validation_file_path = "validation_errors.csv";

const ben_create_results = require("./beneficiary_create_result.json");

let add_to_create_bene = false;
let add_to_validate_bene = false;

function removeComma(str) {
  return str.replace(/,/g, "");
}

function createNestedObject(obj, path, value) {
  const keys = path.split(".");
  let currentObj = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    currentObj[key] = currentObj[key] || {};
    currentObj = currentObj[key];
  }

  if (value !== "") {
    if (keys[keys.length - 1] === "payment_methods") {
      currentObj[keys[keys.length - 1]] = value
        .split(",")
        .map((method) => method.trim());
    } else {
      currentObj[keys[keys.length - 1]] = value;
    }
  }
}

app.get("/create-bene", async (req, res) => {
  res.send("<h1>Creating Beneficiaries</h1>");

  //   let results = [];

  const create_bene = async (bene, index) => {
    await axios
      .request({
        url: "https://api-demo.airwallex.com/api/v1/beneficiaries/create",
        method: "post",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth_token}`,
        },
        data: bene,
      })
      .then(({ data }) => {
        //   console.log(data);
        ben_create_results.successful.results.push({
          name: bene.beneficiary.bank_details.account_name,
          row: index + 1,
          id: data.id,
        });

        ben_create_results.successful.count++;
        console.log(
          "Successfully created - ",
          bene.beneficiary.bank_details.account_name
        );
      })
      .catch((error) => {
        ben_create_results.errors.count++;
        ben_create_results.errors.results.push({
          name: bene.beneficiary.bank_details.account_name,
          data: error.response.data,
        });
        console.log(
          "Error validating - ",
          bene.beneficiary.bank_details.account_name
        );
      });
  };

  for (var i = 0; i < val_results.successful.results.length; i++) {
    console.log(
      i + 1,
      " - ",
      val_results.successful.results[i].data.beneficiary.bank_details
        .account_name
    );

    create_bene(val_results.successful.results[i].data, i);
  }

  setTimeout(() => {
    fs.writeFileSync(
      "beneficiary_create_result.json",
      JSON.stringify(ben_create_results),
      (err) => {
        if (err) throw err;
        console.log("Beneficiary Create Results File Updated");
      }
    );
  }, 12000);
});

app.get("/validate-bene", async (req, res) => {
  res.send("<h1>Validating Beneficiaries</h1>");

  let results = [];

  fs.createReadStream("./create_payment1.csv")
    .pipe(csv())
    .on("data", (row) => {
      const processedRow = {};

      for (const [header, value] of Object.entries(row)) {
        createNestedObject(processedRow, header, value);
      }

      results.push(processedRow);
    })
    .on("end", () => {
      //   console.log(results);
      // You can use the 'results' array of JSON objects with nested structure as needed

      let csv_file_data = "";
      const validate_bene = async (bene, index) => {
        await axios
          .request({
            url: "https://api-demo.airwallex.com/api/v1/beneficiaries/validate",
            method: "post",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${auth_token}`,
            },
            data: bene,
          })
          .then(({ data }) => {
            //   console.log(data);

            if (Object.keys(data).length > 0) {
              val_results.successful.count++;

              val_results.successful.results.push({
                name: bene.beneficiary.bank_details.account_name,
                data: bene,
              });
              console.log(
                "Validation results - ",
                bene.beneficiary.bank_details.account_name,
                " - ",
                data
              );
            }
          })
          .catch((error) => {
            val_results.errors.count++;
            val_results.errors.results.push({
              name: bene.beneficiary.bank_details.account_name,
              data: error.response.data,
              bene: bene,
            });

            // console.log("ERRRRROOOORS ===", error.response.data.errors);

            for (var k = 0; k < error.response.data.errors.length; k++) {
              csv_file_data += `${bene.beneficiary.bank_details.account_name},${
                index + 2
              },${bene.beneficiary.bank_details.bank_country_code},${
                error.response.data.errors[k].source
              },${removeComma(
                error_codes[error.response.data.errors[k].code]
              )},${
                error.response.data.errors[k].params
                  ? JSON.stringify(error.response.data.errors[k].params)
                  : null
              }\n`;
            }
            console.log(
              "Could not validate - ",
              bene.beneficiary.bank_details.account_name,
              " - ",
              error.response.data.code
            );
          });
      };
      for (var i = 0; i < results.length; i++) {
        // console.log(results[i]);
        validate_bene(results[i], i);
      }

      setTimeout(() => {
        console.log("Adding to Validate Beneficiary File");

        fs.writeFileSync(
          "validation_results.json",
          JSON.stringify(val_results),
          (err) => {
            if (err) throw err;

            console.log("Val File Updated");
          }
        );
      }, 12000);

      setTimeout(() => {
        console.log("Adding to Validate Errors File");

        fs.appendFile("validation_errors.csv", csv_file_data, (err) => {
          if (err) throw err;

          console.log("Val Errors Updated");
        });
      }, 3000);
    });
});

app.listen(4242, () => {
  console.log(`Example app listening on Post 4242!!`);
});
