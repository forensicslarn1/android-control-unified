export type PackageAction = "disable" | "uninstall" | "purge";

export type PackageActionDefinition = {
  id: PackageAction;
  label: string;
  command: (packageName: string) => string;
  restore: (packageName: string) => string;
  destructive: boolean;
};

const PACKAGE_NAME = /^[A-Za-z0-9._]+$/;

export function assertPackageName(packageName: string) {
  if (!PACKAGE_NAME.test(packageName)) throw new Error("Invalid package identifier.");
  return packageName;
}

export const PACKAGE_ACTIONS: Record<PackageAction, PackageActionDefinition> = {
  disable: {
    id: "disable",
    label: "Disable",
    command: (packageName) => `pm disable-user --user 0 ${assertPackageName(packageName)}`,
    restore: (packageName) => `cmd package install-existing --user 0 ${assertPackageName(packageName)}`,
    destructive: false,
  },
  uninstall: {
    id: "uninstall",
    label: "Uninstall & Keep Data",
    command: (packageName) => `pm uninstall -k --user 0 ${assertPackageName(packageName)}`,
    restore: (packageName) => `cmd package install-existing --user 0 ${assertPackageName(packageName)}`,
    destructive: true,
  },
  purge: {
    id: "purge",
    label: "Purge / Complete Uninstall",
    command: (packageName) => `pm uninstall --user 0 ${assertPackageName(packageName)}`,
    restore: (packageName) => `cmd package install-existing --user 0 ${assertPackageName(packageName)}`,
    destructive: true,
  },
};

export function packageCommand(action: PackageAction, packageName: string) {
  return PACKAGE_ACTIONS[action].command(packageName);
}

export function packageRestoreCommand(packageName: string) {
  return PACKAGE_ACTIONS.disable.restore(packageName);
}
