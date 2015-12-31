function EventGenerator() {
	// Put code that runs once here
	this.ingressId = 'demo_project_SleepingPlyer_ingress';
	this.traceId = 'demo_project_SleepingPlyer_trace';
	this.createEvent = function() {
		// Put code that runs each time an event is created here
		var event = {
			type: 'demomessage',
		}
		return EventApi.merge( EventApi.factory.eventBase(), event );
	}
	return this;
}