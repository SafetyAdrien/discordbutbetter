// Provide NodeJS.Timeout type for browser environment
declare namespace NodeJS {
  type Timeout = ReturnType<typeof setTimeout>;
  type Interval = ReturnType<typeof setInterval>;
}
