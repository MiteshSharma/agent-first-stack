import { UserTable } from '../../components/UserTable';
import { UserForm } from '../../components/UserForm';
import styles from './Users.module.css';

export function UsersPage() {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>User Management</h2>
      <UserTable />
      <UserForm />
    </div>
  );
}
