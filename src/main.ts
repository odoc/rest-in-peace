export { ServiceInterface as Service, createService } from './service';

export { ResourceHandler, Method, RepresentationPair } from './resourceHandler';

export { ResourceRequest, Resource, ResourceId } from './resourceRequest';
export { ResourceResponse } from './responses/resourceResponse';
export {
  SuccessResponse, SuccessHttpStatusCode
} from './responses/successResponse';
export {
  ClientErrorResponse, ClientErrorHttpStatusCode
} from './responses/clientErrorResponse';
export {
  ServerErrorResponse, ServerErrorHttpStatusCode
} from './responses/serverErrorResponse';

export { AuthHandler } from './authHandler';
export { Identity } from './identity';

export { Representation, Schema } from './representation';