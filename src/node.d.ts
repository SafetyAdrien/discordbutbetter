declare namespace NodeJS {
  type Timeout = ReturnType<typeof setTimeout>;
  type Interval = ReturnType<typeof setInterval>;
}
