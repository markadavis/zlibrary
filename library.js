sap.ui.define([
	"jquery.sap.global",
	"sap/ui/core/library"
], function() {
	"use strict";

	var zlibrary = sap.ui.getCore().initLibrary({
		name: "zlibrary",
		version: "1.0.0",
		dependencies: ["sap.ui.core"],
		types: [],
		interfaces: [],
		controls: [
			"zlibrary.ca.BarcodeScanHandler",
			"zlibrary.wm.WarehouseSelector"
		],
		elements: []
	});

	return zlibrary;

}, false); // bExport