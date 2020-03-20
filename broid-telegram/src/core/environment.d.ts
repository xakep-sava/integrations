export {}

declare global {
  namespace NodeJS {
    interface IProcessEnv {
      NTBA_FIX_319: string | undefined
      NTBA_FIX_350: string | undefined
    }
  }
}
