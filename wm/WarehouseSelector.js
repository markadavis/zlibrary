sap.ui.define([
	"sap/ui/base/Object",
	"sap/ui/model/odata/v2/ODataModel",
	"sap/ui/model/resource/ResourceModel",
	"sap/ui/model/json/JSONModel"
], function(UI5Object, ODataModel, ResourceModel, JSONModel) {
	"use strict";

	return UI5Object.extend("zlibrary.wm.WarehouseSelector", {
		/**
		 * Construct a dialog to choose a Warehouse based on filter criteria.
		 * @class
		 * @alias zlibrary.wm.WarehouseSelector
		 * @public
		 * @param {function} fnCallBack function to call once construction is complete
		 * @param {sap.ui.core.UIComponent} oComponent reference to the caller app's component
		 * @param {boolean} bUseDefault if true the User's default whse will be loaded on init
		 */
		constructor: function(fnCallBack, oComponent, bUseDefault) {
			this._oODataModel = new ODataModel("/sap/opu/odata/sap/ZWM_WHSE_SELECTOR_SRV/");
			this._oResourceModel = new ResourceModel({
				bundleName: "zlibrary.wm.WarehouseSelector"
			});
			this._oResourceBundle = this._oResourceModel.getResourceBundle();
			this._sBoundApp = oComponent.getManifestEntry("sap.app").id;
			this._bUseDefault = bUseDefault ? bUseDefault : false;
			this._oModel = new JSONModel({
				WarehouseNumber: "",
				WarehouseText: ""
			}).setDefaultBindingMode("OneWay");

			// Create and load the Warehouses model.
			this._oODataModel.metadataLoaded().then(function() {
				this._createWarehouseModel();

				// Wait until the personalization object is loaded.
				// Get the personalization data for the app before starting the router.
				var oPersonalizationService = null,
					oPersonalizationContainer = null;

				if (sap.ushell.Container) {
					oPersonalizationService = sap.ushell.Container.getService("Personalization");
					oPersonalizationContainer = oPersonalizationService.getContainer(this._sBoundApp, {
						keyCategory: oPersonalizationService.constants.keyCategory.FIXED_KEY,
						writeFrequency: oPersonalizationService.constants.writeFrequency.LOW,
						clientStorageAllowed: true,
						validity: "infinity"
					}, this.oComponent);

					oPersonalizationContainer.fail(function() {
						jQuery.sap.log.error("Loading personalization data failed.");
					});

					oPersonalizationContainer.done(function(oContainer) {
						this._oPersonizationContainer = oContainer;
						// Set the Warehouse Number on the App State model.
						var sWarehouseNumber = oContainer.getItemValue("WarehouseNumber") || "",
							sWarehouseText = oContainer.getItemValue("WarehouseText") || "";
						if (sWarehouseNumber) {
							this._oModel.setProperty("/WarehouseNumber", sWarehouseNumber);
							this._oModel.setProperty("/WarehouseText", sWarehouseText);
							fnCallBack({
								WarehouseNumber: sWarehouseNumber,
								WarehouseText: sWarehouseText
							});
						} else if (this._bUseDefault) {
							this.getDefaultWarehouse(function(mResponse) {
								if (!mResponse.Error) {
									// Update the local model (in case we are called again).
									this._oModel.setProperty("/WarehouseNumber", mResponse.WarehouseNumber);
									this._oModel.setProperty("/WarehouseText", mResponse.WarehouseText);
									// Update the personaization service.
									this.setPersonalizationValue("WarehouseNumber", mResponse.WarehouseNumber);
									this.setPersonalizationValue("WarehouseText", mResponse.WarehouseText);
									fnCallBack({
										WarehouseNumber: sWarehouseNumber,
										WarehouseText: sWarehouseText
									});
								}
							}.bind(this));
						} else {
							fnCallBack({
								WarehouseNumber: sWarehouseNumber,
								WarehouseText: sWarehouseText
							});
						}
					}.bind(this));
				}
			}.bind(this));
		},

		/* =========================================================== */
		/* begin: event handler methods                                */
		/* =========================================================== */

		/**
		 * Event handler for Change Warehouse event.
		 * @public
		 */
		onChangeWarehouse: function(fnCallBack) {
			this._callBack = fnCallBack;
			this._oChgWhseDialog = new sap.ui.xmlfragment("zlibrary.wm.WarehouseSelector", this);
			this._oChgWhseDialog.setModel(this._oWarehouseModel);
			this._oChgWhseDialog.setModel(this._oResourceModel, "i18n");

			// Select the current Warehouse (list item) if we have one.
			var sWhse = this._oModel.getProperty("/WarehouseNumber");
			if (sWhse) {
				var oList = sap.ui.getCore().byId("masterChgWhse_list"),
					aItems = oList.getItems();
				for (var i = 0; i < aItems.length; i++) {
					var oItem = aItems[i];
					if (oItem.getInfo() === sWhse) {
						oList.setSelectedItem(oItem);
					}
				}
			}

			this._oChgWhseDialog.open();
		},

		/**
		 * Event handler for Change Warehouse list item selection event.
		 * @param {sap.ui.base.Event} oEvent is the event object for the list item select.
		 * @public
		 */
		onChangeWarehouseItemSelect: function() {
			sap.ui.getCore().byId("masterChgWhse_BtnChoose").setProperty("enabled", true);
		},

		/**
		 * Event handler for Change Warehouse Choose dialog.
		 * @param {sap.ui.base.Event} oEvent is the event object Action button "Choose".
		 * @public
		 */
		onChangeWarehouseChoose: function() {
			var oItem = sap.ui.getCore().byId("masterChgWhse_list").getSelectedItem();
			if (oItem && oItem.getInfo()) {
				var sWhseNbr = oItem.getInfo(),
					sWhseTxt = oItem.getTitle();

				if (this._callBack) {
					this._callBack({
						WarehouseNumber: sWhseNbr,
						WarehouseText: sWhseTxt
					});
				}

				// Update the local model (in case we are called again).
				this._oModel.setProperty("/WarehouseNumber", sWhseNbr);
				this._oModel.setProperty("/WarehouseText", sWhseTxt);

				// Update the personaization service.
				this.setPersonalizationValue("WarehouseNumber", sWhseNbr);
				this.setPersonalizationValue("WarehouseText", sWhseTxt);

				// Close the dialog and reload the Master List's data.
				this._oChgWhseDialog.close();
			}
		},

		/**
		 * Event handler for Change Warehouse Cancel dialog.
		 * @public
		 */
		onChangeWarehouseCancel: function() {
			if (this._oChgWhseDialog) {
				this._oChgWhseDialog.close();
			}
		},

		/**
		 * Event handler for Change Warehouse After Close event.
		 * @public
		 */
		onMasterChgWhsesAfterClose: function() {
			if (this._oChgWhseDialog) {
				this._oChgWhseDialog.destroy();
			}
		},

		/* =========================================================== */
		/* begin: helper methods                                       */
		/* =========================================================== */

		/**
		 * Return the current value for Warehouse Number.
		 * @public
		 * @returns {string} value of the warehouse number (if one is set).
		 */
		getDefaultWarehouse: function(fnCallback) {
			this._oODataModel.callFunction("/getDefaultWhse", {
				method: "GET",
				success: function(mWhse) {
					this({
						"WarehouseNumber": mWhse.WarehouseNumber,
						"WarehouseText": mWhse.WarehouseText
					});
				}.bind(fnCallback),
				error: function(oError) {
					this({
						"Error": oError
					});
				}.bind(fnCallback)
			});
		},

		/**
		 * Return the current value for Warehouse Number.
		 * @public
		 * @returns {string} value of the warehouse number (if one is set).
		 */
		getWarehouseNumber: function() {
			return this._oModel.getProperty("/WarehouseNumber");
		},

		/**
		 * Return the current value for Warehouse Text.
		 * @public
		 * @returns {string} value of the warehouse text (if one is set).
		 */
		getWarehouseText: function() {
			return this._oModel.getProperty("/WarehouseText");
		},

		/**
		 * Return the User Info object form the FLP.
		 * @public
		 * @param {string} sID is the ID of the Personailzation item requested.
		 * @return {string} value of the Personailzation item requested.
		 */
		getPersonalizationValue: function(sID) {
			var sItemValue = "";
			if (this._oPersonizationContainer) {
				sItemValue = this._oPersonizationContainer.getItemValue(sID);
			}
			return sItemValue;
		},

		/**
		 * Return the User Info object form the FLP.
		 * @public
		 * @param {string} sID is the ID of the Personailzation item to be saved.
		 * @param {string} sValue of the Personailzation item to be saved.
		 */
		setPersonalizationValue: function(sID, sValue) {
			if (this._oPersonizationContainer) {
				this._oPersonizationContainer.setItemValue(sID, sValue);
				this._oPersonizationContainer.save();
			}
		},

		/* =========================================================== */
		/* begin: private methods                                      */
		/* =========================================================== */

		_createWarehouseModel: function() {
			this._oWarehouseModel = new JSONModel([]);
			this._oODataModel.read("/WarehouseSet", {
				success: function(oData) {
					this._oWarehouseModel = new JSONModel(oData.results);
					if (this._oChgWhseDialog && this._oChgWhseDialog.isOpen()) {
						this._oChgWhseDialog.setModel(this._oWarehouseModel);
						this._oChgWhseDialog.rerender();
					}
				}.bind(this)
			});
		}

	});
});