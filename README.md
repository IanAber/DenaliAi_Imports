# DenaliAi_Imports

Universal CSV import tool for Cherwell

Installation:

To serve the application the files need to be placed in a WEB server folder structure. The WEB server can be the same server that is providing the Cherwell API or can be any other server available. If a different server (not the Cherwell API server) is used the scripts\cherwell\constant_definitions.js file must be editied by changing value for CherwellURL to point to the root of the Cherwell API. For example, if the Cherwell API is at https://server.flycastpartners.com/CherwellAPI then the CherwellURL should be set to https://server.flycastpartners.com. In a hosted situation, since it is not possible to add files to the hosted API server the application can be provided from a local server or any other server including an AWS or Azure server that is available.

The APIKey entry in the scripts\cherwell\constant_definitions.js file must be changed to reflect the APIKey configured in Cherwell. Please see the Cherwell documentation for how to set this up.

Copy the import folder to the root of the serving WEB site, eg. c:\inetpub\wwwroot
Copy the scripts folder to the root of the serving WEB site, eg. c:\inetpub\wwwroot

Apply the blueprint 2021-03-12-IMA-Import Staging.BP to the Cherwell system. This will add the Import Staging object and supporting one-steps, form, grid and automation process.

User instructions for use of the tool are contained in the PDF file included in this project. The user must log in using a Cherwell login. Windows logins are not supported at this time. The first time a user logs in tot he server it may take some considerable time for the server to start up but subsequent logins will be instantaneous. The application manages the token refresh automatically keeping the login alive for the duration of the upload.

When a CSV is imported into the system each row in the file is converted into a JSON object and then imported to the Payload field in the ImportStaging object added by the blueprint. The selected one-step is then executed by an automation process for each row inserted.

The one-steps listed in the drop list on the import form are stoerd in a folder called Automation which is a child of Global with the association of ImportStaging. These one-steps control how the data is processed once it is imported into Cherwell.

For each different file imported a new one-step must be built that understands the layout of the JSON object and how to take that data and process it to do what the importer expects. The Payload field must first be loaded into a variable and converted to a JSON object. Each field value can be accessed using the JSON Patch modifier in the one step to extract the value and work with it.

Once a one-step is built to handle a particular import file format it can be used multiple times by any Cherwell user via the tool.
