import { ConnectorMetadata, WorkOrderConnector } from "./connector.interface";

class ConnectorRegistryClass {
  private connectors: Map<string, WorkOrderConnector> = new Map();

  /**
   * Register a connector implementation
   */
  public register(connector: WorkOrderConnector): void {
    const metadata = connector.getMetadata();
    this.connectors.set(metadata.key.toLowerCase(), connector);
  }

  /**
   * Get connector by key
   */
  public get(key: string): WorkOrderConnector | undefined {
    return this.connectors.get(key.toLowerCase());
  }

  /**
   * Check if connector is registered
   */
  public has(key: string): boolean {
    return this.connectors.has(key.toLowerCase());
  }

  /**
   * List all registered connectors metadata
   */
  public list(): ConnectorMetadata[] {
    return Array.from(this.connectors.values()).map((c) => c.getMetadata());
  }

  /**
   * Clear registry (useful for testing)
   */
  public clear(): void {
    this.connectors.clear();
  }
}

export const ConnectorRegistry = new ConnectorRegistryClass();
