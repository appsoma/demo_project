function EventGenerator() {
	// Put code that runs once here
	this.createEvent = function() {
		// Put code that runs each time an event is created here
		var event = {
			type: 'demomessage',
			mykey2: 11,
			mykey3: EventApi.chance(50) ? true : false,
			mykey4: EventApi.randomInt(37),
		}
		return EventApi.merge( EventApi.factory.eventBase(), event );
	}
	return this;
}