import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  Index,
} from 'sequelize-typescript';

export enum ReportStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

@Table({
  tableName: 'ReportDeliveryLog',
  timestamps: false,
  underscored: true,
})
export class ReportDeliveryLog extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  declare id: number;

  @Index
  @ForeignKey(() => require('./User.model.js').User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  user_id!: number;

  @Index
  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  sent_at!: Date;

  @Column({
    type: DataType.ENUM(...Object.values(ReportStatus)),
    allowNull: false,
  })
  status!: ReportStatus;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  error_message?: string | null;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  message_content?: string | null;

  @Column({
    type: DataType.DATEONLY,
    allowNull: false,
  })
  report_period_start!: string;

  @Column({
    type: DataType.DATEONLY,
    allowNull: false,
  })
  report_period_end!: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  issues_count?: number | null;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  in_cooldown!: boolean;

  @BelongsTo(() => require('./User.model.js').User)
  user?: any;
}
