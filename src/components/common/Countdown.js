import React, {useEffect, useState} from "react";

const Countdown = ({time, showSeconds=false, Render, OnEnded}) => {
  const [countdown, setCountdown] = useState({diff: 0, countdown: ""});
  const [loop, setLoop] = useState(undefined);

  useEffect(() => {
    if(loop) { return; }

    let lastDiff, ended;
    setLoop(setInterval(() => {
      const diffSeconds = Math.ceil((new Date(time) - new Date()) / 1000);

      if(!ended && diffSeconds <= 0 && OnEnded) {
        ended = true;
        OnEnded();
      }

      if(diffSeconds === lastDiff) { return; }
      lastDiff = diffSeconds;

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

      let countdownString = "";
      if(days > 0) {
        countdownString += `${days} ${days === 1 ? "day" : "days"} `;
      }

      if(hours > 0) {
        countdownString += `${hours} ${hours === 1 ? "hour" : "hours"} `;
      }

      if(minutes > 0) {
        countdownString += `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
      }

      if(showSeconds && seconds > 0 || (days === 0 && hours === 0 && minutes === 0 && seconds > 0)) {
        countdownString += ` ${seconds} ${seconds === 1 ? "second" : "seconds"}`;
      }

      setCountdown({
        diff: diffSeconds,
        countdown: countdownString,
        days,
        hours,
        minutes,
        seconds
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
    <div className="countdown">
      { countdown.countdown }
    </div>
  );
};

export default Countdown;
