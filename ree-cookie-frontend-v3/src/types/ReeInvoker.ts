class ReeInvoker {
	constructor({}) {}

	public beforeBuildPsbt(f: any): ReeInvoker {
		f()
		return this
	}

	public onBuildPsbt(f: any): ReeInvoker {
		return this
	}

	public onInvoke(f: any): ReeInvoker {
		return this
	}

	public invoke(f: any) {}
}
