import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  Index,
} from 'sequelize-typescript';
import { User } from './User.model';
import { Issue } from './Issue.model';

@Table({
  tableName: 'UserIssueSnapshot',
  timestamps: true,
  underscored: true,
})
export class UserIssueSnapshot extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  declare id: number;

  // User reference
  @Index('idx_user_issue_snapshot_user_id')
  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare user_id: number;

  // Issue reference
  @Index('idx_user_issue_snapshot_issue_id')
  @ForeignKey(() => Issue)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare issue_id: number;

  // Snapshot metadata
  @Index('idx_user_issue_snapshot_date')
  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  declare snapshot_date: Date;

  @Column({
    type: DataType.DATEONLY,
    allowNull: false,
  })
  declare report_period_start: string;

  @Column({
    type: DataType.DATEONLY,
    allowNull: false,
  })
  declare report_period_end: string;

  // Categorization in report
  @Index('idx_user_issue_snapshot_category')
  @Column({
    type: DataType.STRING(50),
    allowNull: false,
    comment: 'completed, started, updated, open',
  })
  declare category: string;

  // Issue state at snapshot time (for historical accuracy)
  @Column({
    type: DataType.STRING(50),
    allowNull: true,
  })
  declare state_type_snapshot?: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare priority_snapshot?: number;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  declare created_at: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  declare updated_at: Date;

  // Associations
  @BelongsTo(() => User, {
    foreignKey: 'user_id',
    as: 'user',
  })
  user?: User;

  @BelongsTo(() => Issue, {
    foreignKey: 'issue_id',
    as: 'issue',
  })
  issue?: Issue;
}
