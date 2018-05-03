class ResourceResponse {
  private httpResponseStatusCode: number;
  private _error: ResourceResponseError;
  private _data: ResourceMessage;

  private _meta: ResouceMetaData;
}