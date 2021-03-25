var inputType = "string";
var stepped = 0, rowCount = 0, errorCount = 0, firstError;
var start, end;
var firstRun = true;
var maxUnparseLength = 10000;
var importObject = {
	"objectId":"",
	"recId":"",
	"createdCulture":"",
	"createdDateTime":"",
	"createdBy":"",
	"createdById":"",
	"lastModfiedDateTime":"",
	"lastModifiedBy":"",
	"lastModifiedById":"",
	"actionName":"",
	"payLoad":"",
	"parentRecId":"",
	"fileName":"",
	"errors":"",
	"importAction":""
};
var fileName = "";
var onestepDef = "";
var onestepName = "";
var stopProcessing = false;
var rows = 0;

$(function()
{
	$('#submit').click(function()
	{
		if ($(this).prop('disabled') == "true")
			return;

		processFile();
	});

	$('#insert-tab').click(function()
	{
		$('#delimiter').val('\t');
	});
});


function processFile() {
	stopProcessing = false;
	stepped = 0;
	rowCount = 0;
	errorCount = 0;
	firstError = undefined;

	var config = buildConfig();
	var input = $('#input').val();

//		if (inputType == "remote")
//			input = $('#url').val();
//		else if (inputType == "json")
//			input = $('#json').val();

	// Allow only one parse at a time
	$(this).prop('disabled', true);

	if ($('#files')[0].files.length != 1)
	{
		alert("Please select one file to parse.");
		return enableButton();
	}

	fileName = $('#files')[0].files[0].name;
	onestepDef = $('#action option:selected').val();
	onestepName = $('#action option:selected').text().trim();
	rows = 0;
	$('#progress').text("");
	
	$('#files').parse({
		config: config,
		before: function(file, inputElem)
		{
			start = now();
			console.log("Parsing file...", file);
		},
		error: function(err, file)
		{
			console.log("ERROR:", err, file);
			firstError = firstError || err;
			errorCount++;
		},
		complete: function()
		{
			$("#progress").text(rows + " rows saved");
			end = now();
			printStats("Done with all files");
		}
	});
}

function printStats(msg)
{
	if (msg)
		console.log(msg);
	console.log("       Time:", (end-start || "(Unknown; your browser does not support the Performance API)"), "ms");
	console.log("  Row count:", rowCount);
	if (stepped)
		console.log("    Stepped:", stepped);
	console.log("     Errors:", errorCount);
	if (errorCount)
		console.log("First error:", firstError);
}



function buildConfig()
{
	return {
		delimiter: $('#delimiter').val(),
		header: true,
		dynamicTyping: true,
		skipEmptyLines: true,
		preview: 0,
		step: stepFn,
		encoding: '',
		worker: false,
		comments: $('#comments').val(),
		complete: completeFn,
		error: errorFn,
		download: false
	};
}

function saveRecord(jsonObj) {

	// console.log(JSON.stringify(jsonObj));
	// console.log("Object = " + importObject.objectId);
	// console.log("OneStep = " + onestepDef);
	// console.log("file name = " + fileName);
	// console.log("OneStep Name = " + onestepName);

    var body = {busObId:importObject.objectId,
		fields:[
			{ dirty:true, fieldId: importObject.payLoad, value: JSON.stringify(jsonObj) },
			{ dirty:true, fieldId: importObject.actionName, value: onestepName},
			{ dirty:true, fieldId: importObject.fileName, value: fileName},
			{ dirty:true, fieldId: importObject.importAction, value: onestepDef.replaceAll("<","&lt;").replaceAll(">","&gt;")}
		]};
	if (stopProcessing) {
		return false;
	}
	try {
		if (refreshToken()) {
			$.ajaxSetup({headers:{'Authorization':"Bearer " + token.access,
								'Content-Type':"application/json"}});
			xhr = $.ajax({
				type:"POST",
				url: CherwellURL + "/cherwellapi/api/V1/savebusinessobject",
				data:  JSON.stringify(body),
				dataType: 'json',
				async: false
			});
			if (xhr.status === 200) {
				rows++;
				if (!(rows % 10)) {
					$("#progress").text(rows + " rows saved");
				}
				console.log("Row saved");
			} else {
				throw(xhr.statusText + ' - ' + xhr.responseText);
			}
		}
	} catch (e) {
		stopProcessing = true;
		alert("Failed! - " + e);
	}
}

async function stepFn(results, parser)
{
	parser.pause();

	if (stopProcessing) {
		parser.abort();
	}
	stepped++;
	if (results)
	{
		saveRecord(results.data);
		if (results.errors)
		{
			errorCount += results.errors.length;
			firstError = firstError || results.errors[0];
		}
	}
	parser.resume();
}

function loginSuccess(data, status, xhr) {
    getToken(data, status, xhr);
    var now = new Date();
    if (token.expires > now) {
        $("#loginDiv").css('display','none');
        $("#formDiv").css('visibility', 'visible');
		getImportObject();
    }
}

function getActions() {
    body = { busObId:ReceivingObj,
                fields:[Rcv_CompanyName,Rcv_RecID],
                filters:[{fieldId:Rcv_Template,
                        operator:"eq",
                        value:"True"}]
            };
    try {
        if (refreshToken()) {
            $.ajaxSetup({headers:{'Authorization':"Bearer " + token.access,
                                'Content-Type':"application/json"}});
            $.get(CherwellURL+"/CherwellAPI/api/V1/getonestepactions/association/"+importObject.objectId+"/scope/Global", null, populateActions)
                .fail(failedAjaxCall);
        }
    } catch (e) {
        alert(e);
    }
}

function populateActions(data, status, xhr) {
    var records = data.root.childFolders;
    records.forEach(function(folder, index) {
		if (folder.name == 'Automation') {
			folder.childItems.forEach(function(action, index) {
				actionDef = `<Trebuchet><ActionInfoDef ActionType="OneStep"><Translations><Translation Key="Alias#en-US">${action.displayName}</Translation><Translation Key="Description#en-US">${action.description}</Translation></Translations><ParameterList><Parameter Name="ID">${action.id}</Parameter><Parameter Name="Scope">Global</Parameter><Parameter Name="Owner">${importObject.objectId}</Parameter><Parameter Name="Folder">${action.parentFolder}</Parameter></ParameterList></ActionInfoDef></Trebuchet>`;
				$('#action').append($('<option>', {
									value: actionDef,
									text: action.displayName,
									title: action.description}))
			})
		}
    });
}

function enableSubmit() {
	if(($("#action").val() != "") && ($('#files')[0].files.length == 1)) {
		$("#submit").prop("disabled", false);
	} else {
		$("#submit").prop("disabled", true);
	}

}

function getImportObject() {
	objDef = {	};
	if (refreshToken()) {
		$.ajaxSetup({headers:{'Authorization':"Bearer " + token.access, 'Content-Type':"application/json"}});
		xhr = $.ajax({
			type:"GET",
			url: CherwellURL + "/CherwellAPI/api/V1/getbusinessobjectsummary/busobname/ImportStaging",
			data:  null,
			dataType: 'json',
			async: false
		});
        if (xhr.status == 200) {
            objResponse = JSON.parse(xhr.responseText);
			importObject.objectId = objResponse[0].busObId;
		} else {
            alert( "Failed to get the ImportStaging Object - Error: " + xhr.status + "\n" + xhr.responseText);
            return false;
        }
		$.ajaxSetup({headers:{'Authorization':"Bearer " + token.access, 'Content-Type':"application/json"}});
		body = {
			"busObId":importObject.objectId,
			"includeAll":true
		};
		xhr = $.ajax({
			type:"POST",
			url: CherwellURL + "/CherwellAPI/api/V1/getbusinessobjecttemplate",
			data: JSON.stringify(body),
			dataType: 'json',
			async: false
		})
		if (xhr.status == 200) {
			objResponse = JSON.parse(xhr.responseText);
			objResponse.fields.forEach(function(value, index, array) {
				switch (value.name) {
					case "RecID" : importObject.recId = value.fieldId;
						break;
					case "CreatedDateTime" : importObject.createdDateTime = value.fieldId;
						break;
					case "CreatedBy" : importObject.createdBy = value.fieldId;
						break;
					case "CreatedByID" : importObject.createdById = value.fieldId;
						break;
					case "CreatedCulture" : importObject.createdCulture = value.fieldId;
						break;
					case "LastModDateTime" : importObject.lastModfiedDateTime = value.fieldId;
						break;
					case "LastModBy" : importObject.lastModifiedBy = value.fieldId;
						break;
					case "LastModByID" : importObject.lastModifiedById = value.fieldId;
						break;
					case "ActionName" : importObject.actionName = value.fieldId;
						break;
					case "Payload" : importObject.payLoad = value.fieldId;
						break;
					case "ParentRecID" : importObject.parentRecId = value.fieldId;
						break;
					case "FileName" : importObject.fileName = value.fieldId;
						break;
					case "Errors" : importObject.errors = value.fieldId;
						break;
					case "ImportAction" : importObject.importAction = value.fieldId;
						break;
				}
			})
			if ((importObject.actionName == "")	|| (importObject.fileName == "") || (importObject.importAction == "") || (importObject.payLoad == "")) {
				alert ("Failed to get the required field definiions for the ImportStaging object.");
				return false;
			}
			getActions();
		} else {
			alert( "Failed to get the object definitions for the ImportStaging object");
			return false;
		}
		return true;
	} else {
		return false;
	}
}

function failedAjaxCall(xhr, status, error) {
	stopProcessing = true;
	alert("Failed : " + status + " | Error : " + error + " | " + xhr.responseText)
}

function completeFn(results)
{
	end = now();

	if (results && results.errors)
	{
		if (results.errors)
		{
			errorCount = results.errors.length;
			firstError = results.errors[0];
		}
		if (results.data && results.data.length > 0)
			rowCount = results.data.length;
	}

	printStats("Parse complete");
//	console.log("    Results:", results);

	// icky hack
	setTimeout(enableButton, 500);
}

function errorFn(err, file)
{
	end = now();
	console.log("ERROR:", err, file);
	enableButton();
}

function enableButton()
{
	$('#submit').prop('disabled', false);
}

function now()
{
	return typeof window.performance !== 'undefined'
			? window.performance.now()
			: 0;
}
