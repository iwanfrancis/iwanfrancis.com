function Logo() {
  return (
    <div
      className={
        'w-8 h-8 bg-foreground text-background rounded-md aspect-square flex items-center justify-center group'
      }
      role="img"
      aria-label="Iwan Francis logo"
    >
      <span
        className="font-geist leading-0 text-md font-bold rotate-45 group-hover:rotate-0 transition-transform"
        aria-hidden="true"
      >
        IF
      </span>
    </div>
  )
}

export default Logo
