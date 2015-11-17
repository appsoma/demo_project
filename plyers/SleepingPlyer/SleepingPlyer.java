import com.appsoma.Pump.Plyer;
import org.json.simple.JSONObject;

public class SleepingPlyer extends Plyer {
	public Boolean trigger( JSONObject event ) {
		return true;
	}

	public void logic( JSONObject eventIn ) {
		String note = "mykey3 is false";

		String sleepTime = System.getenv("SLEEPTIME");
		Thread.sleep( Integer.parseInt(sleepTime) );

		JSONObject eventOut = new JSONObject();
		eventOut.put( "sleepTime", sleepTime );
		eventOut.put( "event", eventIn );
		
		this.trace( eventOut );
	}
}
