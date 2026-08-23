import { ConnectorRegistry } from "./core/connector-registry";
import { MockConnector } from "./mock/mock.connector";
import { CsvExcelConnector } from "./csv/csv-excel.connector";
import { EmailConnector } from "./email/email.connector";
import { PPWLinkConnector } from "./ppw-link/ppw-link.connector";
import { MCSConnector } from "./mcs/mcs.connector";
import { ServiceLinkConnector } from "./servicelink/servicelink.connector";
import { ManualConnector } from "./manual/manual.connector";

// Auto-register built-in connectors
export function initializeConnectors() {
  if (!ConnectorRegistry.has("mock")) {
    ConnectorRegistry.register(new MockConnector());
  }
  if (!ConnectorRegistry.has("csv_excel")) {
    ConnectorRegistry.register(new CsvExcelConnector());
  }
  if (!ConnectorRegistry.has("email_intake")) {
    ConnectorRegistry.register(new EmailConnector());
  }
  if (!ConnectorRegistry.has("mcs")) {
    ConnectorRegistry.register(new MCSConnector());
  }
  if (!ConnectorRegistry.has("servicelink")) {
    ConnectorRegistry.register(new ServiceLinkConnector());
  }
  if (!ConnectorRegistry.has("altisource")) {
    ConnectorRegistry.register(
      new PPWLinkConnector({
        clientKey: "altisource",
        clientName: "Altisource",
      })
    );
  }
  if (!ConnectorRegistry.has("singlesource")) {
    ConnectorRegistry.register(
      new PPWLinkConnector({
        clientKey: "singlesource",
        clientName: "SingleSource Property Solutions",
      })
    );
  }
  if (!ConnectorRegistry.has("cyprexx")) {
    ConnectorRegistry.register(
      new PPWLinkConnector({
        clientKey: "cyprexx",
        clientName: "Cyprexx Services",
      })
    );
  }
  if (!ConnectorRegistry.has("fivebrothers")) {
    ConnectorRegistry.register(
      new PPWLinkConnector({
        clientKey: "fivebrothers",
        clientName: "Five Brothers",
      })
    );
  }
  if (!ConnectorRegistry.has("guardian")) {
    ConnectorRegistry.register(
      new PPWLinkConnector({
        clientKey: "guardian",
        clientName: "Guardian / iProperty",
      })
    );
  }
  if (!ConnectorRegistry.has("g7")) {
    ConnectorRegistry.register(
      new PPWLinkConnector({
        clientKey: "g7",
        clientName: "G7 Property Preservation",
      })
    );
  }
  if (!ConnectorRegistry.has("manual_entry")) {
    ConnectorRegistry.register(new ManualConnector());
  }
}

// Initialize immediately
initializeConnectors();

export * from "./core/connector.interface";
export * from "./core/connector-registry";
export * from "./core/connector-types";
export * from "./core/connector-errors";
