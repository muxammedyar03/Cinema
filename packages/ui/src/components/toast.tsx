import styles from "./toast.module.css";

export function Toast({ message, open = true }: { message: string; open?: boolean }) {
	if (!open || !message) return null;
	return <output className={styles.toast}>{message}</output>;
}
