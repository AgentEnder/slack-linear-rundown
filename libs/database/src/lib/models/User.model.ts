import {
  Table,
  Column,
  Model,
  DataType,
  HasMany,
  Index,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';

@Table({
  tableName: 'User',
  timestamps: true,
  underscored: true,
})
export class User extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  declare id: number;

  @Index
  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  })
  declare email: string;

  @Index
  @Column({
    type: DataType.STRING,
    unique: true,
    allowNull: true,
  })
  declare slack_user_id: string | null;

  @Index
  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare linear_user_id?: string | null;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare slack_real_name?: string | null;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare linear_name?: string | null;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
  declare is_active: boolean;

  @Index
  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
  declare receive_reports: boolean;

  @CreatedAt
  @Column({
    type: DataType.DATE,
    field: 'created_at',
  })
  declare created_at: Date;

  @UpdatedAt
  @Column({
    type: DataType.DATE,
    field: 'updated_at',
  })
  declare updated_at: Date;

  @HasMany(() => require('./CooldownSchedule.model.js').CooldownSchedule)
  cooldown_schedules?: any[];

  @HasMany(() => require('./ReportDeliveryLog.model.js').ReportDeliveryLog)
  report_delivery_logs?: any[];
}
