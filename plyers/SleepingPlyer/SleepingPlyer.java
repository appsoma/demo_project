import com.appsoma.Pump.Plyer;
import org.json.simple.JSONObject;

public class SleepingPlyer extends Plyer {
	public Boolean trigger( JSONObject event ) {
		return true;
	}

	public void logic( JSONObject eventIn ) {
		String sleepTime = System.getenv("SLEEPTIME");
		if( sleepTime == null ) {
			sleepTime = "1";
		}
		System.out.println( "SLEEPTIME " + sleepTime );
		try {
			Thread.sleep( Integer.parseInt(sleepTime) );
		}
		catch( InterruptedException e ) {
		}

		JSONObject eventOut = new JSONObject();
		eventOut.put( "sleepTime", sleepTime );
		eventOut.put( "event", eventIn );
		
		this.trace( eventOut );
	}
}
