import React, {useEffect, useState} from "react";
import {rootStore} from "Stores";
import {observer} from "mobx-react";

const Countdown = observer(({time, showSeconds=false, Render, OnEnded, className=""}) => {
  const [countdown, setCountdown] = useState({diff: 0, countdown: ""});
  const [loop, setLoop] = useState(undefined);

  useEffect(() => {
    if(loop) { return; }

    let lastDiff, ended;
    setLoop(setInterval(() => {
      let diffSeconds = Math.ceil((new Date(time) - new Date()) / 1000);

      if(!ended && diffSeconds <= 0 && OnEnded) {
        ended = true;
        OnEnded();
      }

      if(diffSeconds === lastDiff) { return; }
      lastDiff = diffSeconds;

      if(!showSeconds && diffSeconds > 59) {
        // If not showing seconds for full countdown, bump time by a minute so e.g. '1 minute, 50 seconds' shows up as '2 minutes'
        diffSeconds += 60;
      }

      let days = Math.floor(Math.max(0, diffSeconds) / 60 / 60 / 24);
      let hours = Math.floor(Math.max(0, diffSeconds) / 60 / 60) % 24;
      let minutes = Math.floor(Math.max(0, diffSeconds) / 60 % 60);
      let seconds = Math.ceil(Math.max(diffSeconds, 0) % 60);

      if(minutes === 60) {
        hours += 1;
        minutes = 0;
      }

      if(hours === 24) {
        days += 1;
        hours = 0;
      }

      const status = {
        diff: diffSeconds,
        days,
        daysUnit: rootStore.l10n.time_units[days === 1 ? "day" : "days"],
        hours,
        hoursUnit: rootStore.l10n.time_units[hours === 1 ? "hour" : "hours"],
        minutes,
        minutesUnit: rootStore.l10n.time_units[minutes === 1 ? "minute" : "minutes"],
        seconds,
        secondsUnit: rootStore.l10n.time_units[seconds === 1 ? "second" : "seconds"]
      };

      let countdownString = "";
      if(days > 0) {
        countdownString += `${days} ${status.daysUnit} `;
      }

      if(hours > 0) {
        countdownString += `${hours} ${status.hoursUnit} `;
      }

      if(minutes > 0) {
        countdownString += `${minutes} ${status.minutesUnit} `;
      }

      if(showSeconds && seconds > 0 || (days === 0 && hours === 0 && minutes === 0 && seconds > 0)) {
        countdownString += ` ${seconds} ${status.secondsUnit}`;
      }

      setCountdown({
        ...status,
        countdown: countdownString
      });
    }, 100));

    // Stop interval on unmount
    return () => {
      setLoop(undefined);
      clearInterval(loop);
    };
  }, []);

  if(Render) {
    return Render(countdown);
  }

  return (
    <div className={`countdown ${className}`}>
      <div className="countdown__unit-container">
        <div className="countdown__value">
          { countdown.days }
        </div>
        <div className="countdown__unit">
          { countdown.daysUnit }
        </div>
      </div>
      <div className="countdown__unit-container">
        <div className="countdown__value">
          { countdown.hours }
        </div>
        <div className="countdown__unit">
          { countdown.hoursUnit }
        </div>
      </div>
      <div className="countdown__unit-container">
        <div className="countdown__value">
          { countdown.minutes }
        </div>
        <div className="countdown__unit">
          { countdown.minutesUnit }
        </div>
      </div>
      {
        showSeconds ?
          <div className="countdown__unit-container">
            <div className="countdown__value">
              { countdown.seconds }
            </div>
            <div className="countdown__unit">
              { countdown.secondsUnit }
            </div>
          </div> : null
      }
    </div>
  );
});

export default Countdown;
